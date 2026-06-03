'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface SafeQuestion {
  _id: string;
  text: string;
  options: string[];
  difficulty: 1 | 2 | 3;
  timeExpectedSeconds: number;
}

interface SubmitResult {
  isCorrect: boolean;
  correctIndex: number;
  solution: string;
}

const LETTERS = ['A', 'B', 'C', 'D'];
const TIME_PER_QUESTION = 60; // seconds

export function SpeedDrillPlayer({ sectionId, sectionTitle, chapterId, chapterTitle }: {
  sectionId: string;
  sectionTitle: string;
  chapterId: string;
  chapterTitle: string;
}) {
  const [questions, setQuestions] = useState<SafeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    fetch(`/api/practice/questions?sectionId=${sectionId}`)
      .then((r) => r.json())
      .then((d: { questions: SafeQuestion[] }) => { setQuestions(d.questions ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sectionId]);

  const submitAnswer = useCallback(async (optIdx: number, timedOut = false) => {
    const q = questions[index];
    if (!q || selected !== null) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setSelected(optIdx);
    const elapsed = Math.round((Date.now() - startRef.current) / 1000);
    const res = await fetch('/api/practice/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: q._id, selectedIndex: optIdx, timeTakenSeconds: elapsed }),
    });
    const data = await res.json() as SubmitResult;
    setResult(data);
    if (data.isCorrect && !timedOut) setCorrect((c) => c + 1);
    // Auto-advance after 1.5s in speed mode
    setTimeout(() => advance(), 1500);
  }, [questions, index, selected]);

  function advance() {
    const nextIdx = index + 1;
    if (nextIdx >= questions.length) { setDone(true); return; }
    setIndex(nextIdx);
    setSelected(null);
    setResult(null);
    setTimeLeft(TIME_PER_QUESTION);
    startRef.current = Date.now();
  }

  // Countdown timer
  useEffect(() => {
    if (loading || done || selected !== null || questions.length === 0) return;
    setTimeLeft(TIME_PER_QUESTION);
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          void submitAnswer(0, true); // timed out → auto-submit first option (counts as wrong)
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index, loading, done, selected, questions.length]);

  if (loading) return <div className="flex min-h-64 items-center justify-center text-sm text-inkMuted">Loading…</div>;

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="font-display text-2xl text-ink">No questions yet</p>
        <p className="mt-2 text-sm text-inkMuted">Ask admin to generate questions for this section.</p>
        <Link href="/drills" className="mt-6 inline-block"><Button variant="ghost">← Back</Button></Link>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((correct / questions.length) * 100);
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-4xl font-bold text-ink">{pct}%</p>
        <p className="mt-2 font-display text-2xl text-ink">Speed Drill Done</p>
        <p className="mt-1 text-sm text-inkMuted">{correct} of {questions.length} correct</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/drills"><Button variant="ghost">← More drills</Button></Link>
          <Button onClick={() => { setIndex(0); setCorrect(0); setSelected(null); setResult(null); setDone(false); setTimeLeft(TIME_PER_QUESTION); }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const current = questions[index];
  if (!current) return null;

  const timerPct = (timeLeft / TIME_PER_QUESTION) * 100;
  const timerColor = timeLeft > 20 ? 'bg-green-400' : timeLeft > 10 ? 'bg-amber-400' : 'bg-red-500';

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <header className="mb-4 flex items-center justify-between">
        <Link href="/drills" className="text-sm text-inkMuted hover:text-ink">← {chapterTitle}</Link>
        <span className="text-xs font-semibold text-inkMuted">{index + 1}/{questions.length}</span>
      </header>

      {/* Timer bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-inkMuted mb-1">
          <span>🏃 Speed Drill</span>
          <span className={`font-bold tabular-nums ${timeLeft <= 10 ? 'text-red-500' : ''}`}>{timeLeft}s</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-accentMuted">
          <div className={`h-full rounded-full transition-all duration-1000 ${timerColor}`} style={{ width: `${timerPct}%` }} />
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface shadow-sm">
        <div className="px-6 py-5">
          <p className="text-base leading-relaxed text-ink">{current.text}</p>
        </div>
        <div className="space-y-2 px-6 pb-5">
          {current.options.map((opt, oi) => {
            const isSelected = selected === oi;
            const isCorrect = result && oi === result.correctIndex;
            const isWrong = result && isSelected && !result.isCorrect;
            let cls = 'w-full flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-150 ';
            if (!result) cls += isSelected ? 'border-accent bg-accentMuted' : 'border-line bg-surface text-ink hover:border-accent cursor-pointer';
            else if (isCorrect) cls += 'border-green-400 bg-green-50 text-green-800';
            else if (isWrong) cls += 'border-red-400 bg-red-50 text-red-800';
            else cls += 'border-line bg-surface text-inkMuted/40';
            return (
              <button key={oi} type="button" className={cls} disabled={!!result} onClick={() => void submitAnswer(oi)}>
                <span className="mt-0.5 shrink-0 text-xs font-bold">{LETTERS[oi]}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
