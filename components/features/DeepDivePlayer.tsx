'use client';

// Deep Dive reuses LessonPlayer but POSTs to /api/deepdive instead of /api/teach.
// This component is identical to LessonPlayer except for the API endpoint and the
// prep screen copy.

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EquationOverlay, type Equation } from '@/components/whiteboard/EquationOverlay';
import { Whiteboard, type WhiteboardHandle } from '@/components/whiteboard/Whiteboard';
import { CommandScheduler } from '@/components/tutor/CommandScheduler';
import { SiriAvatar } from '@/components/tutor/SiriAvatar';
import { parseNdjsonStream } from '@/components/tutor/parse-ndjson';
import type { QuickCheckQuestion } from '@/lib/teaching/command-schema';

interface Props {
  sectionId: string;
  chapterId: string;
  chapterTitle: string;
  sectionTitle: string;
  sectionOrder: number;
  learningObjectives?: string[];
}

type PlayState = 'prep' | 'connecting' | 'playing' | 'ended' | 'error';

export function DeepDivePlayer({ sectionId, chapterId, chapterTitle, sectionTitle, sectionOrder, learningObjectives = [] }: Props) {
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
  const [audioFailed, setAudioFailed] = useState(false);

  const speaking = caption !== null && state === 'playing';

  const startDive = useCallback(() => {
    const wb = wbRef.current;
    if (!wb) return;
    const AudioCtor = typeof window !== 'undefined'
      ? window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
    if (AudioCtor) {
      const ctx = new AudioCtor();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') setAudioBlocked(true);
    }
    const scheduler = new CommandScheduler({
      whiteboard: wb, audioContext: audioContextRef.current,
      setCaption, setDoubtPrompt, setQuickCheck: setQuickCheckQuestions,
      addEquation: (eq) => setEquations((p) => [...p, eq]),
      clearEquations: () => setEquations([]),
      setEnded: () => setState('ended'),
      shouldRouteAudioLocally: () => true,
      setAudioFailed,
    });
    schedulerRef.current = scheduler;
    const controller = new AbortController();
    controllerRef.current = controller;
    setState('connecting');
    void (async () => {
      try {
        const res = await fetch('/api/deepdive', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sectionId }), signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`Stream failed (${res.status})`);
        setState('playing');
        await scheduler.run(parseNdjsonStream(res.body));
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to start');
        setState('error');
      }
    })();
  }, [sectionId]);

  useEffect(() => () => {
    controllerRef.current?.abort();
    schedulerRef.current?.abort();
    void audioContextRef.current?.close().catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <Link href="/deepdive" className="text-sm text-inkMuted hover:text-ink">← Deep Dives</Link>
        <p className="text-sm text-inkMuted">🔬 Deep Dive · {sectionTitle}</p>
      </header>
      <div className="relative">
        {state === 'connecting' && <div className="absolute inset-x-0 top-0 z-20 h-0.5"><div className="h-full w-2/3 animate-pulse rounded-full bg-accent" /></div>}
        <div className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <Whiteboard ref={wbRef} />
          <EquationOverlay equations={equations} />
          {state === 'prep' && (
            <div className="absolute inset-0 z-40 flex items-start justify-center overflow-y-auto bg-canvas/95 backdrop-blur-sm p-6">
              <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-7 shadow-lg">
                <div className="flex items-center gap-3">
                  <SiriAvatar speaking={false} className="h-12 w-12 shrink-0" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-accent">🔬 Deep Dive</p>
                    <h1 className="font-display text-2xl text-ink">{sectionTitle}</h1>
                  </div>
                </div>
                <div className="mt-5 rounded-xl border border-line bg-canvas p-4 text-sm text-inkMuted">
                  Aryan Sir goes beyond the textbook — derivations from first principles, the history behind the formula, and why it works the way it does. Not for the exam. For real understanding.
                </div>
                <div className="mt-3 text-xs text-inkMuted">⏱ ~15–20 minutes</div>
                <Button size="lg" className="mt-5" onClick={startDive}>Start Deep Dive →</Button>
              </div>
            </div>
          )}
          {state === 'connecting' && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-canvas/70 backdrop-blur-sm">
              <SiriAvatar speaking={false} className="h-20 w-20" />
              <p className="text-sm text-inkMuted">Going deep…</p>
            </div>
          )}
          {doubtPrompt && state === 'playing' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-canvas/85 backdrop-blur">
              <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 mx-4">
                <p className="text-center font-semibold text-ink">{doubtPrompt}</p>
                <button type="button" onClick={() => schedulerRef.current?.continue()} className="mt-4 w-full rounded-xl border border-line py-2 text-sm text-inkMuted hover:border-accent">
                  Continue
                </button>
              </div>
            </div>
          )}
          {state === 'ended' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-canvas/90 backdrop-blur">
              <div className="max-w-md rounded-2xl border border-line bg-surface p-10 text-center shadow-xl">
                <p className="text-3xl">🧠</p>
                <p className="mt-3 font-display text-2xl text-ink">Deep dive complete</p>
                <p className="mt-2 text-sm text-inkMuted">Now you know the why behind the what.</p>
                <div className="mt-6 flex justify-center gap-3">
                  <Link href={`/learn/${sectionId}`}><Button variant="ghost">Regular lesson</Button></Link>
                  <Link href="/deepdive"><Button>More dives</Button></Link>
                </div>
              </div>
            </div>
          )}
          {audioBlocked && state !== 'ended' && (
            <button type="button" onClick={async () => { await audioContextRef.current?.resume(); setAudioBlocked(false); }}
              className="absolute right-4 top-4 z-40 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">
              Enable sound
            </button>
          )}
          {(state === 'playing' || state === 'connecting') && (
            <div className="absolute bottom-4 right-4 z-30 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-line bg-ink/90 shadow-lg lg:h-32 lg:w-32">
              <SiriAvatar speaking={speaking} className="h-full w-full" />
            </div>
          )}
        </div>
        {audioFailed && (state === 'playing' || state === 'connecting') && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            🔇 Voice audio is unavailable right now — following along with captions instead.
          </div>
        )}
        {caption && state === 'playing' && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-5 py-3 shadow-sm">
            <p className="text-sm leading-relaxed text-ink">{caption}</p>
            <button type="button" onClick={() => schedulerRef.current?.skip()} className="shrink-0 rounded-full px-3 py-1 text-xs text-inkMuted hover:bg-accentMuted hover:text-accent">Skip ▸</button>
          </div>
        )}
        {state === 'error' && error && <div className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>}
      </div>
    </div>
  );
}
