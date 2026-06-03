'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EquationOverlay, type Equation } from '@/components/whiteboard/EquationOverlay';
import { Whiteboard, type WhiteboardHandle } from '@/components/whiteboard/Whiteboard';
import { markSectionCompleted, markSectionStarted } from '@/lib/actions/progress';
import type { QuickCheckQuestion } from '@/lib/teaching/command-schema';
import { CommandScheduler } from './CommandScheduler';
import { SiriAvatar } from './SiriAvatar';
import { parseNdjsonStream } from './parse-ndjson';

interface Props {
  sectionId: string;
  chapterId: string;
  chapterTitle: string;
  sectionTitle: string;
  sectionOrder: number;
  learningObjectives?: string[];
  estimatedMinutes?: number;
}

type PlayState = 'prep' | 'connecting' | 'playing' | 'ended' | 'error';

export function LessonPlayer({
  sectionId,
  chapterId,
  chapterTitle,
  sectionTitle,
  sectionOrder,
  learningObjectives = [],
  estimatedMinutes = 10,
}: Props) {
  const wbRef = useRef<WhiteboardHandle>(null);
  const schedulerRef = useRef<CommandScheduler | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const [caption, setCaption] = useState<string | null>(null);
  const [doubtPrompt, setDoubtPrompt] = useState<string | null>(null);
  const [quickCheckQuestions, setQuickCheckQuestions] = useState<QuickCheckQuestion[] | null>(null);
  const [equations, setEquations] = useState<Equation[]>([]);
  const [state, setState] = useState<PlayState>('prep');
  const [error, setError] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [answering, setAnswering] = useState(false);

  // speaking = a narration is currently playing (drives SiriAvatar animation)
  const speaking = caption !== null && state === 'playing';

  const startLesson = useCallback(() => {
    const wb = wbRef.current;
    if (!wb) return;

    // Initialise AudioContext on user gesture (required by browsers)
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
      shouldRouteAudioLocally: () => true, // always use OpenAI TTS
    });
    schedulerRef.current = scheduler;

    const controller = new AbortController();
    controllerRef.current = controller;

    setState('connecting');

    void (async () => {
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
  }, [sectionId]);

  // Cleanup on unmount
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
    fetch(`/api/flashcards/generate?sectionId=${sectionId}`, {
      method: 'POST',
    }).catch(() => undefined);
  }, [state, sectionId]);

  async function enableAudio() {
    try {
      await audioContextRef.current?.resume();
      setAudioBlocked(false);
    } catch {
      /* ignore */
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

  // ── Prep screen ────────────────────────────────────────────────────────────
  if (state === 'prep') {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link
          href={`/chapter/${chapterId}`}
          className="text-sm text-inkMuted transition-colors hover:text-ink"
        >
          ← {chapterTitle}
        </Link>

        <div className="mt-8 rounded-2xl border border-line bg-surface p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <SiriAvatar speaking={false} className="h-12 w-12 shrink-0" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-accent">
                Aryan Sir is ready
              </p>
              <h1 className="font-display text-2xl tracking-tight text-ink">{sectionTitle}</h1>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-line bg-canvas p-5">
            <p className="text-sm font-semibold text-ink">In this lesson you will:</p>
            {learningObjectives.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {learningObjectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-inkMuted">
                    <span className="mt-0.5 shrink-0 font-semibold text-accent">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {obj}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-inkMuted">
                Follow Aryan Sir through the concepts step by step.
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-inkMuted">
            <span>⏱ ~{estimatedMinutes} min</span>
            <span>·</span>
            <span>Section {String(sectionOrder).padStart(2, '0')}</span>
          </div>

          <Button size="lg" className="mt-6" onClick={startLesson}>
            Start lesson with Aryan Sir →
          </Button>

          <p className="mt-3 text-xs text-inkMuted">
            You can ask questions any time during the lesson
          </p>
        </div>
      </div>
    );
  }

  // ── Lesson player ──────────────────────────────────────────────────────────
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
        Lessons work best on a desktop screen. Scroll right on mobile to see the full whiteboard.
      </div>

      <div className="relative">
        {/* Connecting progress bar */}
        {state === 'connecting' && (
          <div className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-accent" />
          </div>
        )}

        <div className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <Whiteboard ref={wbRef} />
          <EquationOverlay equations={equations} />

          {/* Preparing overlay */}
          {state === 'connecting' && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-canvas/70 backdrop-blur-sm">
              <SiriAvatar speaking={false} className="h-20 w-20" />
              <p className="text-sm font-medium text-inkMuted">Aryan Sir is preparing your lesson…</p>
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
          {state === 'ended' && <LessonEnd chapterId={chapterId} sectionId={sectionId} />}

          {/* Enable audio banner */}
          {audioBlocked && state !== 'ended' && (
            <button
              type="button"
              onClick={enableAudio}
              className="absolute right-4 top-4 z-40 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-accentHover"
            >
              Enable sound
            </button>
          )}

          {/* Answering doubt indicator */}
          {answering && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-full bg-ink/85 px-4 py-1.5 text-sm font-medium text-white shadow-md">
              Thinking…
            </div>
          )}

          {/* Siri avatar — bottom right */}
          {(state === 'playing' || state === 'connecting') && (
            <div className="absolute bottom-4 right-4 z-30 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-line bg-ink/90 shadow-lg lg:h-32 lg:w-32">
              <SiriAvatar speaking={speaking} className="h-full w-full" />
            </div>
          )}
        </div>

        {/* Caption bar */}
        {caption && state === 'playing' && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-5 py-3 shadow-sm">
            <p className="text-sm leading-relaxed text-ink">{caption}</p>
            <button
              type="button"
              onClick={() => schedulerRef.current?.skip()}
              className="shrink-0 rounded-full px-3 py-1 text-xs text-inkMuted hover:bg-accentMuted hover:text-accent"
            >
              Skip ▸
            </button>
          </div>
        )}

        {/* Error */}
        {state === 'error' && error && (
          <div className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
            <button
              type="button"
              onClick={() => { setState('prep'); setError(null); }}
              className="ml-4 underline"
            >
              Go back
            </button>
          </div>
        )}
      </div>
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
        <p className="text-center text-lg font-semibold text-ink">{prompt}</p>
        <p className="mt-1 text-center text-sm text-inkMuted">
          Type your question below, or continue if you&apos;re good.
        </p>
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
          placeholder="What's unclear? Ask anything…"
          rows={3}
          maxLength={1000}
          disabled={submitting}
          className="mt-4 block w-full resize-none rounded-xl border border-line bg-surface p-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accentMuted disabled:opacity-50"
        />
        <p className="mt-1.5 text-xs text-inkMuted">⌘ + Enter to submit</p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onContinue}
            disabled={submitting}
            className="text-sm text-inkMuted hover:text-ink disabled:opacity-50"
          >
            Continue lesson
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

function LessonEnd({ chapterId, sectionId }: { chapterId: string; sectionId: string }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-canvas/90 backdrop-blur">
      <div className="max-w-md rounded-2xl border border-line bg-surface p-10 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accentMuted text-2xl">
          🎉
        </div>
        <p className="font-display text-3xl text-ink">Lesson complete!</p>
        <p className="mt-3 text-sm text-inkMuted">
          Marked as done. +100 XP earned. Flashcards generated.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href={`/practice/${sectionId}`}>
            <Button>Practice now →</Button>
          </Link>
          <Link
            href={`/chapter/${chapterId}`}
            className="text-sm text-inkMuted hover:text-ink"
          >
            Back to chapter
          </Link>
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
    return 'A couple to revisit — the explanations below will help.';
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
