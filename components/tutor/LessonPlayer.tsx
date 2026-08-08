'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EquationOverlay, type Equation } from '@/components/whiteboard/EquationOverlay';
import { Whiteboard, type WhiteboardHandle } from '@/components/whiteboard/Whiteboard';
import { markSectionCompleted, markSectionStarted } from '@/lib/actions/progress';
import type { QuickCheckQuestion } from '@/lib/teaching/command-schema';
import { CommandScheduler } from './CommandScheduler';
import { HeyGenAvatar, type HeyGenAvatarHandle } from './HeyGenAvatar';
import { SiriAvatar } from './SiriAvatar';
import { parseNdjsonStream } from './parse-ndjson';

// Voice input uses MediaRecorder + server-side Whisper (see /api/transcribe).
// The browser's SpeechRecognition is unreliable (returns "network" on many
// Chromium/Linux builds since its cloud backend is unavailable).
function canRecordAudio(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof window.MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

interface Props {
  sectionId: string;
  chapterId: string;
  chapterTitle: string;
  sectionTitle: string;
  sectionOrder: number;
  nextSectionId?: string | null;
  nextSectionTitle?: string | null;
  learningObjectives?: string[];
  estimatedMinutes?: number;
  ncertClass?: string;
  ncertSubject?: string;
  examWeightPct?: number;
}

type PlayState = 'prep' | 'connecting' | 'playing' | 'ended' | 'error';

// Temporarily disabled: NEXT_PUBLIC_HEYGEN_AVATAR_ID currently points to a
// mismatched (female) avatar. Until it's repointed to a male Indian-presenting
// avatar, skip the HeyGen connection entirely so the illustrated Aryan Sir
// (SiriAvatar) shows consistently instead. Flip back to true once the avatar_id
// is fixed — no other code changes needed.
const HEYGEN_ENABLED = false;

export function LessonPlayer({
  sectionId,
  chapterId,
  chapterTitle,
  sectionTitle,
  sectionOrder,
  nextSectionId = null,
  nextSectionTitle = null,
  learningObjectives = [],
  estimatedMinutes = 10,
  ncertClass = '',
  ncertSubject = '',
  examWeightPct = 0,
}: Props) {
  const wbRef = useRef<WhiteboardHandle>(null);
  const schedulerRef = useRef<CommandScheduler | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const avatarRef = useRef<HeyGenAvatarHandle>(null);
  const avatarReadyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Prefetch: start /api/teach while user reads the prep card to eliminate start latency
  const prefetchRef = useRef<Promise<Response> | null>(null);
  const prefetchCtrlRef = useRef<AbortController | null>(null);
  // Voice input (MediaRecorder → /api/transcribe)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);

  const [caption, setCaption] = useState<string | null>(null);
  const [doubtPrompt, setDoubtPrompt] = useState<string | null>(null);
  const [quickCheckQuestions, setQuickCheckQuestions] = useState<QuickCheckQuestion[] | null>(null);
  const [equations, setEquations] = useState<Equation[]>([]);
  const [state, setState] = useState<PlayState>('prep');
  const [error, setError] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [askText, setAskText] = useState('');
  const [paused, setPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [avatarReady, setAvatarReady] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState<'idle' | 'connecting' | 'ready' | 'failed'>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const askInputRef = useRef<HTMLInputElement>(null);

  // Load/auto-save notes
  useEffect(() => {
    const saved = localStorage.getItem(`notes_${sectionId}`);
    if (saved) setNotes(saved);
  }, [sectionId]);
  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem(`notes_${sectionId}`, notes), 500);
    return () => clearTimeout(t);
  }, [notes, sectionId]);

  // Prefetch the lesson stream while user reads the prep card so start is instant
  useEffect(() => {
    const ctrl = new AbortController();
    prefetchCtrlRef.current = ctrl;
    prefetchRef.current = fetch('/api/teach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionId }),
      signal: ctrl.signal,
    });
    return () => {
      ctrl.abort();
      prefetchCtrlRef.current = null;
      prefetchRef.current = null;
    };
  }, [sectionId]);

  // Elapsed time timer — only ticks when playing and not paused
  useEffect(() => {
    if (state === 'playing' && !paused) {
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [state, paused]);

  const speaking = caption !== null && state === 'playing' && !paused;

  // Teacher state label shown in the panel
  function teacherStateLabel(): string {
    if (state === 'connecting') return 'Preparing your lesson…';
    if (answering) return 'Aryan Sir is answering…';
    if (paused) return 'Paused — waiting for you';
    if (caption) return 'Aryan Sir is explaining…';
    if (state === 'playing') return 'Aryan Sir is writing on the board…';
    return '';
  }

  // Time display
  const totalSeconds = estimatedMinutes * 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const remMin = Math.floor(remainingSeconds / 60);
  const remSec = String(remainingSeconds % 60).padStart(2, '0');
  const timeLabel = remainingSeconds > 0 ? `${remMin}:${remSec} left` : 'Almost done!';

  const startLesson = useCallback(() => {
    const wb = wbRef.current;
    if (!wb) return;

    const AudioCtor =
      typeof window !== 'undefined'
        ? window.AudioContext ??
          (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (AudioCtor) {
      const ctx = new AudioCtor();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') setAudioBlocked(true);
    }

    const scheduler = new CommandScheduler({
      whiteboard: wb,
      audioContext: audioContextRef.current,
      setCaption,
      setDoubtPrompt,
      setQuickCheck: setQuickCheckQuestions,
      addEquation: (eq) => setEquations((prev) => [...prev, eq]),
      clearEquations: () => setEquations([]),
      setEnded: () => setState('ended'),
      shouldRouteAudioLocally: () => !avatarReadyRef.current,
      // Always provide the function — it reads the ref at call time, so the
      // avatar will be used once it connects (even if not ready at creation).
      sayViaAvatar: (text: string) => {
        const a = avatarRef.current;
        if (!a) return Promise.reject(new Error('avatar not mounted'));
        return a.say(text);
      },
      setAudioFailed,
    });
    schedulerRef.current = scheduler;

    const controller = new AbortController();
    controllerRef.current = controller;

    setState('connecting');
    setPaused(false);
    setElapsedSeconds(0);

    // Claim prefetched promise (started on prep screen mount). On failure fall back to fresh fetch.
    const prefetchPending = prefetchRef.current;
    prefetchRef.current = null;
    prefetchCtrlRef.current = null;

    void (async () => {
      try {
        let res: Response;
        if (prefetchPending) {
          try {
            res = await prefetchPending;
          } catch {
            // Prefetch was aborted or failed — start a fresh request
            if (controller.signal.aborted) return;
            res = await fetch('/api/teach', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sectionId }),
              signal: controller.signal,
            });
          }
        } else {
          res = await fetch('/api/teach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sectionId }),
            signal: controller.signal,
          });
        }
        if (!res.ok || !res.body) {
          const errBody = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errBody.error ?? `Stream failed (${res.status})`);
        }
        setState('playing');
        await scheduler.run(parseNdjsonStream(res.body));
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to start lesson');
        setState('error');
      }
    })();
  }, [sectionId]);

  // Cleanup
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      schedulerRef.current?.abort();
      void audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (state !== 'playing') return;
    markSectionStarted(sectionId).catch(() => undefined);
  }, [state, sectionId]);

  useEffect(() => {
    if (state !== 'ended') return;
    markSectionCompleted(sectionId).catch(() => undefined);
    fetch('/api/xp/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'lesson_complete' }),
    }).catch(() => undefined);
    fetch(`/api/flashcards/generate?sectionId=${sectionId}`, { method: 'POST' }).catch(() => undefined);
  }, [state, sectionId]);

  async function enableAudio() {
    try { await audioContextRef.current?.resume(); setAudioBlocked(false); } catch { /* ignore */ }
  }

  function handlePauseResume() {
    const scheduler = schedulerRef.current;
    if (!scheduler) return;
    if (paused) {
      scheduler.resumePlayback();
      setPaused(false);
    } else {
      scheduler.pausePlayback();
      setPaused(true);
    }
  }

  async function submitDoubt(doubtText: string) {
    const scheduler = schedulerRef.current;
    if (!scheduler) return;
    setDoubtPrompt(null);
    setAnswering(true);
    try {
      const res = await fetch('/api/doubt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          doubt: doubtText,
          recentNarrations: scheduler.getNarrateHistory().slice(-4),
        }),
      });
      if (!res.ok || !res.body) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error ?? `Doubt failed (${res.status})`);
      }
      await scheduler.continueWithDoubt(parseNdjsonStream(res.body));
    } catch {
      scheduler.continue();
    } finally {
      setAnswering(false);
    }
  }

  async function handleUserAsk() {
    const text = askText.trim();
    if (!text || answering) return;
    const scheduler = schedulerRef.current;
    if (!scheduler) return;
    setAskText('');
    scheduler.freeze();
    setAnswering(true);
    try {
      const res = await fetch('/api/doubt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          doubt: text,
          recentNarrations: scheduler.getNarrateHistory().slice(-4),
        }),
      });
      if (!res.ok || !res.body) throw new Error('Ask failed');
      await scheduler.continueWithDoubt(parseNdjsonStream(res.body));
    } catch {
      // resume silently on error
    } finally {
      setAnswering(false);
      scheduler.unfreeze();
    }
  }

  // Stop the current narration / avatar speech without ending the lesson
  function handleSkip() {
    schedulerRef.current?.skip();
    avatarRef.current?.interrupt();
  }

  // Records mic audio and sends it to /api/transcribe (Whisper). We record
  // rather than use the browser SpeechRecognition because the latter's cloud
  // backend is unavailable on many Chromium builds (fails with "network").
  function stopRecording() {
    // Triggers onstop, which uploads the audio. Stream is closed there.
    mediaRecorderRef.current?.state === 'recording' && mediaRecorderRef.current.stop();
  }

  async function startVoiceInput() {
    // Toggle off if already recording.
    if (isListening) {
      stopRecording();
      return;
    }
    if (!canRecordAudio()) {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    setVoiceError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setVoiceError('Microphone blocked. Allow mic access in your browser, then try again.');
      return;
    }

    micStreamRef.current = stream;
    audioChunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      setIsListening(false);
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      mediaRecorderRef.current = null;

      const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      audioChunksRef.current = [];
      if (blob.size === 0) return;

      setIsTranscribing(true);
      try {
        const form = new FormData();
        const ext = (recorder.mimeType || 'audio/webm').includes('mp4') ? 'mp4' : 'webm';
        form.append('audio', blob, `speech.${ext}`);
        const res = await fetch('/api/transcribe', { method: 'POST', body: form });
        if (!res.ok || !res.body) throw new Error(`status ${res.status}`);

        // Stream the transcript in: append deltas to the existing prompt live.
        const prefix = askText ? `${askText} ` : '';
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let transcript = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          transcript += decoder.decode(value, { stream: true });
          setAskText(prefix + transcript);
        }
        transcript = transcript.trim();
        if (transcript) setAskText(prefix + transcript);
        else setVoiceError("Didn't catch that — please try again.");
      } catch {
        setVoiceError('Transcription failed. Please try again.');
      } finally {
        setIsTranscribing(false);
      }
    };

    recorder.start();
    setIsListening(true);
  }

  // Full reset — used by both "Replay lesson" and error recovery.
  // Cleans up all in-progress state so the prep screen can start fresh.
  function handleReplay() {
    prefetchCtrlRef.current?.abort();
    prefetchCtrlRef.current = null;
    prefetchRef.current = null;
    controllerRef.current?.abort();
    schedulerRef.current?.abort();
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    stopRecording();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    wbRef.current?.clear();
    schedulerRef.current = null;
    controllerRef.current = null;
    setCaption(null);
    setDoubtPrompt(null);
    setQuickCheckQuestions(null);
    setEquations([]);
    setAnswering(false);
    setPaused(false);
    setIsListening(false);
    setElapsedSeconds(0);
    setAvatarReady(false);
    setAvatarStatus('idle');
    avatarReadyRef.current = false;
    setState('prep');
  }

  function handleStop() {
    controllerRef.current?.abort();
    schedulerRef.current?.abort();
    void audioContextRef.current?.close().catch(() => undefined);
    setState('ended');
  }

  const showControls = state === 'playing' || state === 'connecting';

  // Track when avatar starts connecting (mounts with showControls)
  useEffect(() => {
    if (HEYGEN_ENABLED && showControls && avatarStatus === 'idle') {
      setAvatarStatus('connecting');
    }
  }, [showControls, avatarStatus]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4 lg:px-6 lg:py-6">

      {/* ── Header bar ── */}
      <header className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href={`/chapter/${chapterId}`}
          className="text-sm text-inkMuted transition-colors hover:text-ink"
        >
          ← {chapterTitle}
        </Link>
        <span className="text-inkMuted/40">|</span>
        <p className="text-sm font-medium text-ink">
          Section {String(sectionOrder).padStart(2, '0')} · {sectionTitle}
        </p>

        {/* NCERT & exam weight badge */}
        {(ncertClass || ncertSubject || examWeightPct > 0) && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {(ncertClass || ncertSubject) && (
              <span className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                📚 {[ncertClass, ncertSubject].filter(Boolean).join(' · ')}
              </span>
            )}
            {examWeightPct > 0 && (
              <span className="rounded-full bg-amber-50 px-3 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                🎯 {examWeightPct}% of CBSE paper
              </span>
            )}
          </div>
        )}
      </header>

      {/* Mobile warning */}
      <div className="mb-3 rounded-md border border-line bg-accentMuted px-4 py-2.5 text-sm text-accent lg:hidden">
        Lessons work best on a desktop screen.
      </div>

      {/* ── Main lesson area: whiteboard (left) + teacher panel (right) ── */}
      <div className="flex gap-4">

        {/* Whiteboard column */}
        <div className="relative min-w-0 flex-1">
          {/* Slim progress bar — only shows during connecting, non-blocking */}
          {state === 'connecting' && (
            <div className="absolute inset-x-0 top-0 z-20 h-1 overflow-hidden rounded-full">
              <div className="h-full w-3/4 animate-pulse rounded-full bg-accent" />
            </div>
          )}

          <div className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
            <Whiteboard ref={wbRef} />
            <EquationOverlay equations={equations} />

            {/* Prep screen overlay */}
            {state === 'prep' && (
              <div className="absolute inset-0 z-40 flex items-start justify-center overflow-y-auto bg-canvas/95 backdrop-blur-sm p-6">
                <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-7 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-line bg-ink/90 shadow-md">
                      <SiriAvatar speaking={false} className="h-full w-full" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                        Aryan Sir is ready
                      </p>
                      <h1 className="font-display text-xl tracking-tight text-ink">{sectionTitle}</h1>
                    </div>
                  </div>

                  {/* Exam weight info on prep card */}
                  {examWeightPct > 0 && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
                      <p className="text-xs font-semibold text-amber-800">
                        🎯 This chapter carries <span className="text-base font-bold">{examWeightPct}%</span> weightage in the CBSE exam
                        {ncertClass ? ` for ${ncertClass}` : ''}.
                        Pay close attention!
                      </p>
                    </div>
                  )}

                  <div className="mt-4 rounded-xl border border-line bg-canvas p-4">
                    <p className="text-sm font-semibold text-ink">In this lesson you will:</p>
                    {learningObjectives.length > 0 ? (
                      <ul className="mt-2 space-y-1.5">
                        {learningObjectives.map((obj, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-inkMuted">
                            <span className="mt-0.5 shrink-0 font-bold text-accent">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            {obj}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-inkMuted">Follow Aryan Sir step by step.</p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-xs text-inkMuted">
                    <span>⏱ ~{estimatedMinutes} min</span>
                    <span>·</span>
                    <span>Section {String(sectionOrder).padStart(2, '0')}</span>
                    <span>·</span>
                    <span>Ask any time</span>
                  </div>
                  <Button size="lg" className="mt-4 w-full" onClick={startLesson}>
                    Start lesson with Aryan Sir →
                  </Button>
                </div>
              </div>
            )}

            {/* Connecting: small non-blocking banner at top — whiteboard stays visible */}
            {state === 'connecting' && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-center gap-2 bg-accent/90 py-2 text-white backdrop-blur-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <span className="text-xs font-semibold tracking-wide">Aryan Sir is preparing…</span>
              </div>
            )}

            {/* Doubt pause overlay */}
            {doubtPrompt && state === 'playing' && (
              <DoubtPause
                prompt={doubtPrompt}
                onContinue={() => schedulerRef.current?.continue()}
                onSubmit={submitDoubt}
              />
            )}

            {/* Quick check overlay */}
            {quickCheckQuestions && state === 'playing' && (
              <QuickCheckOverlay
                questions={quickCheckQuestions}
                onDone={() => schedulerRef.current?.continueAfterQuickCheck()}
              />
            )}

            {/* Lesson end screen */}
            {state === 'ended' && (
              <LessonEnd
                chapterId={chapterId}
                sectionId={sectionId}
                nextSectionId={nextSectionId}
                nextSectionTitle={nextSectionTitle}
                onReplay={handleReplay}
              />
            )}

            {/* Audio blocked banner */}
            {audioBlocked && state !== 'ended' && (
              <button
                type="button"
                onClick={enableAudio}
                className="absolute right-4 top-4 z-40 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-accentHover"
              >
                🔊 Enable sound
              </button>
            )}

            {/* Voice failure banner */}
            {audioFailed && (state === 'playing' || state === 'connecting') && (
              <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-full bg-amber-100 border border-amber-300 px-4 py-1.5 text-xs font-medium text-amber-800 shadow-md">
                🔇 Voice audio unavailable — reading along with captions
              </div>
            )}

            {/* Thinking indicator */}
            {answering && !doubtPrompt && (
              <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-full bg-ink/85 px-4 py-1.5 text-sm font-medium text-white shadow-md">
                💭 Aryan Sir is thinking…
              </div>
            )}

            {/* Caption overlay — fixed at bottom of whiteboard, always visible */}
            {caption && (state === 'playing' || state === 'connecting') && (
              <div className="absolute bottom-0 inset-x-0 z-30 flex items-center gap-3 bg-black/80 backdrop-blur-sm px-4 py-3">
                <span className="shrink-0 text-sm text-white/70">🎙</span>
                <p className="flex-1 min-w-0 text-sm leading-snug text-white font-medium">{caption}</p>
                <button
                  type="button"
                  onClick={handlePauseResume}
                  className="shrink-0 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-semibold text-white transition-colors"
                >
                  {paused ? '▶' : '⏸'}
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  title="Stop speaking"
                  className="shrink-0 rounded-full bg-white/20 hover:bg-red-500/70 px-3 py-1 text-xs font-semibold text-white transition-colors"
                >
                  🔇
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Teacher side panel ── */}
        {showControls && (
          <div className="hidden w-64 shrink-0 flex-col gap-3 lg:flex">

            {/* Avatar card */}
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              {/* HeyGen avatar (hidden until ready) */}
              {HEYGEN_ENABLED && (
                <div className={avatarReady ? 'block' : 'hidden'}>
                  <div className="overflow-hidden rounded-xl border border-line bg-ink aspect-square">
                    <HeyGenAvatar
                      ref={avatarRef}
                      className="h-full w-full"
                      onReady={() => {
                        avatarReadyRef.current = true;
                        setAvatarReady(true);
                        setAvatarStatus('ready');
                      }}
                      onFailed={() => {
                        avatarReadyRef.current = false;
                        setAvatarReady(false);
                        setAvatarStatus('failed');
                      }}
                    />
                  </div>
                </div>
              )}

              {/* SiriAvatar fallback (shown when HeyGen not ready or failed) */}
              {!avatarReady && (
                <div className="flex items-center justify-center h-40 overflow-hidden rounded-xl border border-line bg-ink/90">
                  <SiriAvatar speaking={speaking} className="h-36 w-36" />
                </div>
              )}

              {/* Avatar connection status */}
              {avatarStatus === 'connecting' && (
                <p className="mt-1 text-[10px] text-center text-amber-600 animate-pulse">
                  Connecting avatar…
                </p>
              )}
              {avatarStatus === 'failed' && (
                <p className="mt-1 text-[10px] text-center text-inkMuted/60">
                  Avatar offline · AI voice active
                </p>
              )}
              {avatarStatus === 'ready' && (
                <p className="mt-1 text-[10px] text-center text-green-600">
                  Avatar connected
                </p>
              )}

              {/* Teacher state */}
              <div className="mt-3 flex items-center gap-2">
                <div className={`h-2 w-2 shrink-0 rounded-full ${
                  state === 'connecting' ? 'bg-amber-400 animate-pulse' :
                  answering ? 'bg-blue-400 animate-pulse' :
                  paused ? 'bg-gray-400' :
                  speaking ? 'bg-green-400 animate-pulse' :
                  'bg-green-300'
                }`} />
                <p className="text-xs font-medium text-inkMuted leading-tight">
                  {teacherStateLabel()}
                </p>
              </div>

              {/* Caption in panel (when speaking) */}
              {caption && !paused && (
                <p className="mt-2.5 text-xs leading-relaxed text-ink/80 line-clamp-4 italic">
                  "{caption}"
                </p>
              )}

              {/* Paused indicator */}
              {paused && (
                <div className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs font-medium text-amber-800">Lesson paused. Press Resume to continue.</p>
                </div>
              )}
            </div>

            {/* Time remaining */}
            {state === 'playing' && (
              <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-sm">
                <p className="text-xs text-inkMuted font-medium">Time remaining</p>
                <p className="mt-0.5 text-xl font-bold text-ink tabular-nums">{timeLabel}</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-accentMuted">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-1000"
                    style={{ width: `${Math.min(100, (elapsedSeconds / totalSeconds) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Ask / Interrupt panel */}
            {state === 'playing' && (
              <div className="rounded-2xl border-2 border-accent/20 bg-surface p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-accent mb-2">
                  💬 Ask Aryan Sir
                </p>
                <textarea
                  value={askText}
                  onChange={(e) => setAskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void handleUserAsk();
                    }
                  }}
                  placeholder="Ask anything…"
                  rows={3}
                  disabled={answering || state !== 'playing'}
                  className="block w-full resize-none rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none placeholder:text-inkMuted/50 focus:border-accent disabled:opacity-50"
                />
                <div className="mt-2 flex gap-1.5">
                  {/* Microphone voice input */}
                  {canRecordAudio() && (
                    <button
                      type="button"
                      onClick={() => void startVoiceInput()}
                      disabled={isTranscribing}
                      title={isListening ? 'Stop listening' : 'Speak your question'}
                      className={`rounded-lg border px-2.5 py-2 text-sm transition-colors disabled:opacity-50 ${
                        isListening
                          ? 'border-red-400 bg-red-50 text-red-600 animate-pulse'
                          : 'border-line text-inkMuted hover:border-accent hover:text-accent'
                      }`}
                    >
                      {isTranscribing ? '⏳' : isListening ? '🔴' : '🎤'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleUserAsk()}
                    disabled={!askText.trim() || answering}
                    className="flex-1 rounded-lg bg-accent py-2 text-xs font-bold text-white hover:bg-accentHover disabled:opacity-40 transition-colors"
                  >
                    {answering ? 'Answering…' : 'Ask →'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    title="Stop speaking"
                    className="rounded-lg border border-line px-2.5 py-2 text-sm text-inkMuted hover:border-accent hover:text-accent transition-colors"
                  >
                    🔇
                  </button>
                </div>
                {voiceError ? (
                  <p className="mt-1.5 text-[10px] text-red-500">{voiceError}</p>
                ) : (
                  <p className="mt-1.5 text-[10px] text-inkMuted/60">
                    {isTranscribing
                      ? 'Transcribing…'
                      : isListening
                        ? 'Listening… tap 🔴 to stop'
                        : '⌘+Enter to send'}
                  </p>
                )}
              </div>
            )}

            {/* Notes panel */}
            {state === 'playing' && notesOpen && (
              <div className="rounded-2xl border border-line bg-surface shadow-sm">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <p className="text-xs font-bold text-inkMuted">📝 My Notes</p>
                  <button
                    type="button"
                    onClick={() => setNotesOpen(false)}
                    className="text-sm text-inkMuted hover:text-ink"
                  >×</button>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key points, formulas, questions…"
                  rows={5}
                  className="block w-full resize-none rounded-b-2xl bg-transparent px-4 py-3 text-sm text-ink outline-none placeholder:text-inkMuted/50"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom controls bar — sticky so it's always visible even with tall whiteboard ── */}
      {showControls && (
        <div className="sticky bottom-0 z-40 mt-3 flex flex-wrap items-center gap-2 border-t border-line bg-canvas/95 py-2 backdrop-blur-sm -mx-4 px-4 lg:-mx-6 lg:px-6">

          {/* PAUSE / RESUME — most prominent */}
          {state === 'playing' && (
            <button
              type="button"
              onClick={handlePauseResume}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-colors ${
                paused
                  ? 'bg-accent text-white hover:bg-accentHover'
                  : 'border-2 border-accent bg-accentMuted text-accent hover:bg-accent hover:text-white'
              }`}
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
          )}

          {/* STOP SPEAKING — stops current narration without ending lesson */}
          {state === 'playing' && (
            <button
              type="button"
              onClick={handleSkip}
              title="Stop speaking now"
              className="flex items-center gap-2 rounded-xl border-2 border-line bg-surface px-4 py-2.5 text-sm font-semibold text-inkMuted hover:border-danger hover:text-danger transition-colors"
            >
              🔇 Stop speaking
            </button>
          )}

          {/* Mobile ask input (shown on small screens where side panel is hidden) */}
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 shadow-sm focus-within:border-accent lg:hidden min-w-0">
            <span className="text-sm shrink-0">💬</span>
            <input
              ref={askInputRef}
              type="text"
              value={askText}
              onChange={(e) => setAskText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleUserAsk(); }
              }}
              placeholder="Ask anything…"
              disabled={answering || state === 'connecting'}
              className="flex-1 min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-inkMuted/60 disabled:opacity-50"
            />
            {canRecordAudio() && (
              <button
                type="button"
                onClick={() => void startVoiceInput()}
                disabled={isTranscribing}
                title={isListening ? 'Stop listening' : 'Ask by voice'}
                className={`shrink-0 text-base transition-colors disabled:opacity-50 ${isListening ? 'text-red-500 animate-pulse' : 'text-inkMuted hover:text-accent'}`}
              >
                {isTranscribing ? '⏳' : isListening ? '🔴' : '🎤'}
              </button>
            )}
            {askText.trim() && !answering && (
              <button
                type="button"
                onClick={() => void handleUserAsk()}
                className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white hover:bg-accentHover"
              >
                Ask →
              </button>
            )}
            {answering && (
              <span className="shrink-0 text-xs text-accent animate-pulse">Answering…</span>
            )}
          </div>

          {/* Time remaining on mobile */}
          {state === 'playing' && (
            <div className="hidden items-center gap-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-inkMuted sm:flex lg:hidden">
              <span>⏱</span>
              <span className="tabular-nums font-medium">{timeLabel}</span>
            </div>
          )}

          {/* Notes toggle */}
          {state === 'playing' && (
            <button
              type="button"
              onClick={() => setNotesOpen((o) => !o)}
              title="Toggle notes"
              className={`rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                notesOpen
                  ? 'border-accent bg-accentMuted text-accent'
                  : 'border-line bg-surface text-inkMuted hover:border-accent hover:text-accent'
              }`}
            >
              📝
            </button>
          )}

          {/* End lesson — clearly labeled, separated from stop-speaking */}
          {state === 'playing' && (
            <button
              type="button"
              onClick={handleStop}
              title="End lesson"
              className="rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-inkMuted hover:border-danger hover:text-danger transition-colors"
            >
              End lesson
            </button>
          )}

          {/* Time remaining (desktop) */}
          {state === 'playing' && (
            <span className="ml-auto text-xs font-medium text-inkMuted tabular-nums hidden xl:block">
              ⏱ {timeLabel}
            </span>
          )}
        </div>
      )}

      {/* Mobile notes panel (below controls on small screens) */}
      {notesOpen && state === 'playing' && (
        <div className="mt-3 rounded-xl border border-line bg-surface shadow-sm lg:hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-xs font-semibold text-inkMuted">📝 Notes (auto-saved)</p>
            <button type="button" onClick={() => setNotesOpen(false)} className="text-inkMuted hover:text-ink text-base leading-none">×</button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key points, formulas, questions…"
            rows={5}
            className="block w-full resize-none rounded-b-xl bg-transparent px-4 py-3 text-sm text-ink outline-none placeholder:text-inkMuted/50"
          />
        </div>
      )}

      {/* Error */}
      {state === 'error' && error && (
        <div className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
          <button
            type="button"
            onClick={() => { handleReplay(); setError(null); }}
            className="ml-4 underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

// ── DoubtPause ─────────────────────────────────────────────────────────────────

function DoubtPause({
  prompt,
  onContinue,
  onSubmit,
}: {
  prompt: string;
  onContinue: () => void;
  onSubmit: (doubt: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    await onSubmit(trimmed);
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-canvas/85 backdrop-blur">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-8 shadow-xl mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-accentMuted text-xl">🖐</div>
          <div>
            <p className="font-semibold text-ink">Aryan Sir is checking in</p>
            <p className="text-sm text-inkMuted">{prompt}</p>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void handleSubmit(); }
          }}
          placeholder="Anything unclear? Ask here…"
          rows={3}
          maxLength={1000}
          disabled={submitting}
          className="block w-full resize-none rounded-xl border border-line bg-surface p-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accentMuted disabled:opacity-50"
        />
        <p className="mt-1.5 text-xs text-inkMuted">⌘ + Enter to submit</p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onContinue}
            disabled={submitting}
            className="text-sm text-inkMuted hover:text-ink disabled:opacity-50"
          >
            Continue lesson →
          </button>
          <Button onClick={handleSubmit} disabled={!text.trim() || submitting}>
            {submitting ? 'Asking…' : 'Ask Aryan Sir'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── LessonEnd ──────────────────────────────────────────────────────────────────

function LessonEnd({
  chapterId,
  sectionId,
  nextSectionId,
  nextSectionTitle,
  onReplay,
}: {
  chapterId: string;
  sectionId: string;
  nextSectionId?: string | null;
  nextSectionTitle?: string | null;
  onReplay: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-canvas/90 backdrop-blur">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-xl mx-4">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accentMuted text-2xl">
          🎉
        </div>
        <p className="font-display text-3xl text-ink">Lesson complete!</p>
        <p className="mt-2 text-sm text-inkMuted">+100 XP · Flashcards ready · Progress saved</p>

        <div className="mt-6 flex flex-col gap-2.5">
          {nextSectionId ? (
            <Link href={`/learn/${nextSectionId}`} className="block">
              <Button className="w-full">
                Next: {nextSectionTitle ?? 'Next section'} →
              </Button>
            </Link>
          ) : (
            <Link href={`/practice/${sectionId}`} className="block">
              <Button className="w-full">Practice this section →</Button>
            </Link>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Use a button — not a Link — so we properly reset state for same-URL replay */}
            <button
              type="button"
              onClick={onReplay}
              className="text-xs text-inkMuted hover:text-accent transition-colors"
            >
              Replay lesson
            </button>
            <span className="text-inkMuted">·</span>
            <Link href={`/practice/${sectionId}`} className="text-xs text-inkMuted hover:text-accent transition-colors">
              Practice
            </Link>
            <span className="text-inkMuted">·</span>
            <Link href={`/chapter/${chapterId}`} className="text-xs text-inkMuted hover:text-accent transition-colors">
              Chapter roadmap
            </Link>
            <span className="text-inkMuted">·</span>
            <Link href="/flashcards" className="text-xs text-inkMuted hover:text-accent transition-colors">
              Flash cards
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── QuickCheckOverlay ──────────────────────────────────────────────────────────

const LETTERS = ['A', 'B', 'C', 'D'];

function QuickCheckOverlay({
  questions,
  onDone,
}: {
  questions: QuickCheckQuestion[];
  onDone: () => void;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  const score = submitted
    ? answers.filter((a, i) => a === questions[i]?.correctIndex).length
    : 0;

  function scoreMessage() {
    if (score === questions.length) return 'Perfect score — you got every one!';
    if (score >= questions.length - 1) return 'Almost perfect — one small slip.';
    return 'A couple to revisit — explanations below will help.';
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-canvas/85 backdrop-blur py-8">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-8 shadow-xl mx-4">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-accent">
          Quick Check · {questions.length} questions
        </p>

        <div className="mt-5 space-y-6">
          {questions.map((q, qi) => (
            <div key={q.id}>
              <p className="text-sm font-medium leading-relaxed text-ink">{q.text}</p>
              <div className="mt-2 space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  const isCorrect = oi === q.correctIndex;
                  let cls = 'w-full flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm ';
                  if (!submitted) {
                    cls += selected
                      ? 'border-accent bg-accentMuted text-accent'
                      : 'border-line bg-surface text-ink hover:border-accent cursor-pointer';
                  } else {
                    if (isCorrect) cls += 'border-green-400 bg-green-50 text-green-800';
                    else if (selected) cls += 'border-red-400 bg-red-50 text-red-800';
                    else cls += 'border-line bg-surface text-inkMuted/40';
                  }
                  return (
                    <button
                      key={oi}
                      type="button"
                      className={cls}
                      disabled={submitted}
                      onClick={() => {
                        if (submitted) return;
                        setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)));
                      }}
                    >
                      <span className="mt-0.5 shrink-0 text-xs font-bold">{LETTERS[oi]}</span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {submitted && answers[qi] !== q.correctIndex && (
                <p className="mt-2 text-xs leading-relaxed text-inkMuted">{q.explanation}</p>
              )}
            </div>
          ))}
        </div>

        {!submitted ? (
          <Button
            className="mt-6 w-full"
            disabled={answers.some((a) => a === null)}
            onClick={() => setSubmitted(true)}
          >
            Submit answers
          </Button>
        ) : (
          <div className="mt-6 space-y-3 text-center">
            <p className="text-sm font-medium text-ink">
              {score}/{questions.length} — {scoreMessage()}
            </p>
            <Button className="w-full" onClick={onDone}>
              Continue lesson →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
