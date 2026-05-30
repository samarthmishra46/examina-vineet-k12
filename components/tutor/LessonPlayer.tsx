'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EquationOverlay, type Equation } from '@/components/whiteboard/EquationOverlay';
import { Whiteboard, type WhiteboardHandle } from '@/components/whiteboard/Whiteboard';
import { markSectionCompleted, markSectionStarted } from '@/lib/actions/progress';
import type { QuickCheckQuestion } from '@/lib/teaching/command-schema';
import { CommandScheduler } from './CommandScheduler';
import { HeyGenAvatar, type HeyGenAvatarHandle } from './HeyGenAvatar';
import { parseNdjsonStream } from './parse-ndjson';

interface Props {
  sectionId: string;
  chapterId: string;
  chapterTitle: string;
  sectionTitle: string;
  sectionOrder: number;
}

type PlayState = 'connecting' | 'playing' | 'ended' | 'error';

export function LessonPlayer({
  sectionId,
  chapterId,
  chapterTitle,
  sectionTitle,
  sectionOrder,
}: Props) {
  const wbRef = useRef<WhiteboardHandle>(null);
  const schedulerRef = useRef<CommandScheduler | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const avatarRef = useRef<HeyGenAvatarHandle>(null);
  // Mirror of avatarReady for the scheduler closure to read fresh values.
  const avatarReadyRef = useRef(false);

  const [caption, setCaption] = useState<string | null>(null);
  const [doubtPrompt, setDoubtPrompt] = useState<string | null>(null);
  const [quickCheckQuestions, setQuickCheckQuestions] = useState<QuickCheckQuestion[] | null>(null);
  const [equations, setEquations] = useState<Equation[]>([]);
  const [state, setState] = useState<PlayState>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [answering, setAnswering] = useState(false);

  useEffect(() => {
    const wb = wbRef.current;
    if (!wb) return;

    // AudioContext is still created — it's needed for the OpenAI TTS
    // fallback path when the avatar isn't available.
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
      // When the avatar is ready, delegate the narrate to it; otherwise the
      // scheduler falls back to the OpenAI TTS local-audio path.
      shouldRouteAudioLocally: () => !avatarReadyRef.current,
      sayViaAvatar: async (text) => {
        const avatar = avatarRef.current;
        if (!avatar) throw new Error('avatar handle missing');
        try {
          await avatar.say(text);
        } catch (err) {
          // One failed say() means the WebRTC stream is wedged. Flip
          // avatarReady so every subsequent narrate goes straight to OpenAI
          // TTS — no more 10s timeouts adding silence to the lesson.
          avatarReadyRef.current = false;
          throw err;
        }
      },
    });
    schedulerRef.current = scheduler;

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/teach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sectionId }),
          signal: controller.signal,
        });
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

    return () => {
      controller.abort();
      scheduler.abort();
      void audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
    };
  }, [sectionId]);

  // Mark the section as in-progress the first time playback starts.
  useEffect(() => {
    if (state !== 'playing') return;
    markSectionStarted(sectionId).catch((err) => {
      console.warn('[progress] markStarted failed:', err);
    });
  }, [state, sectionId]);

  // Mark the section as completed when end_lesson fires.
  useEffect(() => {
    if (state !== 'ended') return;
    markSectionCompleted(sectionId).catch((err) => {
      console.warn('[progress] markCompleted failed:', err);
    });
  }, [state, sectionId]);

  async function enableAudio() {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    try {
      await ctx.resume();
      setAudioBlocked(false);
    } catch (err) {
      console.warn('[lesson] AudioContext.resume failed:', err);
    }
  }

  async function submitDoubt(doubtText: string) {
    const scheduler = schedulerRef.current;
    if (!scheduler) return;

    // Close the doubt overlay immediately so the student sees the whiteboard
    // while we wait for Claude. The "Answering…" pill covers the in-between.
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
    } catch (err) {
      console.error('[lesson] doubt failed:', err);
      // Resume the main lesson so the student isn't stuck.
      scheduler.continue();
    } finally {
      setAnswering(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <Link
          href={`/chapter/${chapterId}`}
          className="text-sm text-inkMuted transition-colors duration-std ease-std hover:text-ink"
        >
          ← {chapterTitle}
        </Link>
        <p className="text-sm text-inkMuted">
          Section {String(sectionOrder).padStart(2, '0')} · {sectionTitle}
        </p>
      </header>

      <div className="mb-4 rounded-md border border-line bg-accentMuted px-4 py-3 text-sm text-accent lg:hidden">
        Lessons are designed for a desktop screen. You can still play this on
        mobile — scroll horizontally to see the full whiteboard.
      </div>

      <div className="relative">
        {state === 'connecting' && (
          <div
            className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden"
            role="progressbar"
            aria-label="Loading lesson"
          >
            <div className="h-full w-1/3 animate-pulse bg-accent" />
          </div>
        )}

        <div className="relative overflow-hidden rounded-md border border-line bg-surface">
          <Whiteboard ref={wbRef} />
          <EquationOverlay equations={equations} />

          {state === 'connecting' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-inkMuted">
              Preparing your lesson…
            </div>
          )}

          {doubtPrompt && state === 'playing' && (
            <DoubtPause
              prompt={doubtPrompt}
              onContinue={() => schedulerRef.current?.continue()}
              onSubmit={submitDoubt}
            />
          )}

          {quickCheckQuestions && state === 'playing' && (
            <QuickCheckOverlay
              questions={quickCheckQuestions}
              onDone={() => schedulerRef.current?.continueAfterQuickCheck()}
            />
          )}

          {state === 'ended' && <LessonEnd chapterId={chapterId} sectionId={sectionId} />}

          {audioBlocked && state !== 'ended' && (
            <button
              type="button"
              onClick={enableAudio}
              className="absolute right-4 top-4 z-40 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-md transition-colors duration-std ease-std hover:bg-accentHover"
            >
              Enable sound
            </button>
          )}

          {answering && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-full bg-ink/85 px-4 py-1.5 text-sm font-medium text-white shadow-md">
              Answering…
            </div>
          )}

          {/* HeyGen LiveAvatar (lip-syncs to the narration). Renders nothing
              if HeyGen isn't configured or setup fails — lesson plays via
              local OpenAI TTS fallback. */}
          {state !== 'ended' && (
            <div className="absolute bottom-4 right-4 z-30 h-24 w-24 overflow-hidden rounded-full border border-line bg-ink shadow-md lg:h-[260px] lg:w-[200px] lg:rounded-lg">
              <HeyGenAvatar
                ref={avatarRef}
                className="h-full w-full"
                onReady={() => {
                  avatarReadyRef.current = true;
                }}
                onFailed={() => {
                  avatarReadyRef.current = false;
                }}
              />
            </div>
          )}
        </div>

        {caption && state === 'playing' && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3 shadow-sm">
            <p className="text-base text-ink">{caption}</p>
            <button
              type="button"
              onClick={() => {
                // Stop the avatar mid-sentence too; otherwise it would keep
                // mouthing the rest after our scheduler moves on.
                avatarRef.current?.interrupt();
                schedulerRef.current?.skip();
              }}
              aria-label="Skip current narration"
              className="shrink-0 rounded-full px-3 py-1 text-xs text-inkMuted transition-colors duration-std ease-std hover:bg-accentMuted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              Skip ▸
            </button>
          </div>
        )}

        {state === 'error' && error && (
          <div className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

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

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    await onSubmit(trimmed);
    // parent closes the overlay on submit; nothing more to do here
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-canvas/85 backdrop-blur">
      <div className="w-full max-w-lg rounded-lg border border-line bg-surface p-8 shadow-lg">
        <p className="text-center font-display text-xl text-ink">{prompt}</p>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder="Type your doubt…"
          rows={3}
          maxLength={1000}
          disabled={submitting}
          className="mt-6 block w-full resize-none rounded-md border border-line bg-surface p-3 text-sm leading-relaxed text-ink outline-none transition-colors duration-std ease-std focus:border-accent focus:ring-2 focus:ring-accentMuted disabled:opacity-50"
        />
        <p className="mt-2 text-xs text-inkMuted">Press ⌘/Ctrl + Enter to submit</p>
        <div className="mt-5 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onContinue}
            disabled={submitting}
            className="text-sm text-inkMuted transition-colors duration-std ease-std hover:text-ink disabled:opacity-50"
          >
            Skip, continue
          </button>
          <Button onClick={handleSubmit} disabled={!text.trim() || submitting}>
            {submitting ? 'Asking…' : 'Submit doubt'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LessonEnd({ chapterId, sectionId }: { chapterId: string; sectionId: string }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-canvas/90 backdrop-blur">
      <div className="max-w-md rounded-lg border border-line bg-surface p-10 text-center shadow-lg">
        <p className="font-display text-3xl text-ink">Lesson complete</p>
        <p className="mt-3 text-sm text-inkMuted">
          Nice work — marked done. Test yourself now or pick another section.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href={`/practice/${sectionId}`}>
            <Button>Practice this section →</Button>
          </Link>
          <Link
            href={`/chapter/${chapterId}`}
            className="text-sm text-inkMuted transition-colors duration-std ease-std hover:text-ink"
          >
            Back to roadmap
          </Link>
        </div>
      </div>
    </div>
  );
}

const QUICK_CHECK_LETTERS = ['A', 'B', 'C', 'D'];

function QuickCheckOverlay({
  questions,
  onDone,
}: {
  questions: QuickCheckQuestion[];
  onDone: () => void;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  function handleSelect(qIdx: number, optIdx: number) {
    if (submitted) return;
    setAnswers((prev) => prev.map((a, i) => (i === qIdx ? optIdx : a)));
  }

  function handleSubmit() {
    if (answers.some((a) => a === null)) return;
    setSubmitted(true);
  }

  const score = submitted
    ? answers.filter((a, i) => a === questions[i]?.correctIndex).length
    : 0;

  const scoreMessage = () => {
    if (!submitted) return '';
    if (score === questions.length) return 'Perfect! Bilkul solid hai tu.';
    if (score >= questions.length - 1) return 'Almost there! One small slip.';
    return 'Kuch concepts revisit karte hain — but you tried.';
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-canvas/85 backdrop-blur overflow-y-auto py-8">
      <div className="w-full max-w-lg rounded-lg border border-line bg-surface p-8 shadow-lg mx-4">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-inkMuted">
          Quick check — {questions.length} questions
        </p>
        <p className="mt-1 text-center text-sm text-inkMuted">
          Aryan Sir wants to know if that landed.
        </p>

        <div className="mt-6 space-y-6">
          {questions.map((q, qi) => (
            <div key={q.id}>
              <p className="text-sm font-medium text-ink leading-relaxed">{q.text}</p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  const isCorrect = oi === q.correctIndex;
                  let cls =
                    'w-full flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all duration-150 ';
                  if (!submitted) {
                    cls += selected
                      ? 'border-accent bg-accentMuted text-accent'
                      : 'border-line bg-surface text-ink hover:border-accent hover:bg-accentMuted cursor-pointer';
                  } else {
                    if (isCorrect) cls += 'border-green-400 bg-green-50 text-green-800';
                    else if (selected && !isCorrect) cls += 'border-red-400 bg-red-50 text-red-800';
                    else cls += 'border-line bg-surface text-inkMuted/50';
                  }
                  return (
                    <button
                      key={oi}
                      type="button"
                      className={cls}
                      disabled={submitted}
                      onClick={() => handleSelect(qi, oi)}
                    >
                      <span className="mt-0.5 shrink-0 text-xs font-semibold">
                        {QUICK_CHECK_LETTERS[oi]}
                      </span>
                      <span className="leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {submitted && answers[qi] !== q.correctIndex && (
                <p className="mt-2 text-xs text-inkMuted leading-relaxed">
                  {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>

        {!submitted ? (
          <Button
            className="mt-6 w-full"
            disabled={answers.some((a) => a === null)}
            onClick={handleSubmit}
          >
            Submit answers
          </Button>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-center text-sm font-medium text-ink">
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
