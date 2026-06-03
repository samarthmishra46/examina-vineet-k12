'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface SafeQuestion {
  _id: string;
  text: string;
  options: string[];
  difficulty: 1 | 2 | 3;
  sectionTitle: string;
}

interface SubmitResult {
  isCorrect: boolean;
  correctIndex: number;
  solution: string;
}

const LETTERS = ['A', 'B', 'C', 'D'];
const EXAM_DURATION_MINUTES = 45;

export function MockExamPlayer({ totalAvailable }: { totalAvailable: number }) {
  const [phase, setPhase] = useState<'intro' | 'exam' | 'review'>('intro');
  const [questions, setQuestions] = useState<SafeQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [results, setResults] = useState<(SubmitResult | null)[]>([]);
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_MINUTES * 60);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  async function startExam() {
    setLoading(true);
    const res = await fetch('/api/mock-exam/questions');
    const d = await res.json() as { questions: SafeQuestion[] };
    setQuestions(d.questions);
    setAnswers(d.questions.map(() => null));
    setResults(d.questions.map(() => null));
    setLoading(false);
    setPhase('exam');
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          void submitAll();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  async function submitAll() {
    if (timerRef.current) clearInterval(timerRef.current);
    const qs = questions;
    const ans = answers;
    const res = await Promise.all(
      qs.map((q, i) =>
        fetch('/api/practice/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: q._id,
            selectedIndex: ans[i] ?? 0,
            timeTakenSeconds: Math.round((Date.now() - startRef.current) / 1000 / qs.length),
          }),
        }).then((r) => r.json() as Promise<SubmitResult>)
      )
    );
    setResults(res);
    setPhase('review');
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const score = results.filter((r) => r?.isCorrect).length;

  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <Link href="/dashboard" className="text-sm text-inkMuted hover:text-ink">← Dashboard</Link>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
          <p className="text-4xl">🏆</p>
          <h1 className="mt-4 font-display text-3xl text-ink">Mock Exam</h1>
          <p className="mt-3 text-sm text-inkMuted">
            Up to 30 questions drawn from all your chapters. {EXAM_DURATION_MINUTES} minutes. No hints. Just you and the paper.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-line p-3">
              <p className="text-xl font-bold text-ink">30</p>
              <p className="text-xs text-inkMuted">Questions</p>
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="text-xl font-bold text-ink">{EXAM_DURATION_MINUTES}m</p>
              <p className="text-xs text-inkMuted">Time limit</p>
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="text-xl font-bold text-ink">{totalAvailable}</p>
              <p className="text-xs text-inkMuted">Available</p>
            </div>
          </div>
          <Button size="lg" className="mt-6 w-full" onClick={startExam} disabled={loading}>
            {loading ? 'Preparing exam…' : 'Start Exam →'}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'review') {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
          <p className="font-display text-3xl text-ink">Exam Complete</p>
          <p className="mt-3 text-5xl font-bold text-ink">{score}/{questions.length}</p>
          <p className="text-lg text-inkMuted">{pct}%</p>
          <p className="mt-2 text-sm text-inkMuted">
            {pct >= 80 ? 'Excellent! Ready for boards.' : pct >= 60 ? 'Good work. A few gaps to close.' : 'Keep practising — you\'ll get there.'}
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <p className="text-sm font-semibold text-inkMuted uppercase tracking-wide">Review</p>
          {questions.map((q, i) => {
            const r = results[i];
            const a = answers[i];
            return (
              <div key={q._id} className={`rounded-xl border p-4 ${r?.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <p className="text-sm font-medium text-ink">{i + 1}. {q.text}</p>
                <p className="mt-1 text-xs text-inkMuted">
                  Your answer: {a != null ? (LETTERS[a as 0|1|2|3] ?? '—') : '—'} · Correct: {r ? (LETTERS[r.correctIndex as 0|1|2|3] ?? '—') : '—'}
                </p>
                {!r?.isCorrect && r?.solution && (
                  <p className="mt-2 whitespace-pre-line text-xs text-ink/70">{r.solution}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <Link href="/dashboard"><Button variant="ghost">← Dashboard</Button></Link>
          <Button onClick={() => { setPhase('intro'); setIndex(0); setAnswers([]); setResults([]); setTimeLeft(EXAM_DURATION_MINUTES * 60); }}>
            Retake exam
          </Button>
        </div>
      </div>
    );
  }

  // Exam phase
  const current = questions[index];
  if (!current) return null;
  const timerPct = (timeLeft / (EXAM_DURATION_MINUTES * 60)) * 100;
  const timerColor = timerPct > 30 ? 'bg-accent' : timerPct > 10 ? 'bg-amber-400' : 'bg-red-500';

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-inkMuted">Q{index + 1} of {questions.length}</span>
        <span className={`tabular-nums text-sm font-bold ${timeLeft < 300 ? 'text-red-500' : 'text-inkMuted'}`}>
          ⏱ {formatTime(timeLeft)}
        </span>
      </div>

      {/* Timer bar */}
      <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-accentMuted">
        <div className={`h-full rounded-full transition-all duration-1000 ${timerColor}`} style={{ width: `${timerPct}%` }} />
      </div>

      {/* Question */}
      <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
        <p className="text-xs text-inkMuted mb-3">{current.sectionTitle}</p>
        <p className="text-base leading-relaxed text-ink">{current.text}</p>
        <div className="mt-5 space-y-2">
          {current.options.map((opt, oi) => {
            const sel = answers[index] === oi;
            return (
              <button
                key={oi}
                type="button"
                onClick={() => setAnswers((prev) => prev.map((a, i) => (i === index ? oi : a)))}
                className={`w-full flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all ${sel ? 'border-accent bg-accentMuted text-accent' : 'border-line bg-surface text-ink hover:border-accent'}`}
              >
                <span className="mt-0.5 shrink-0 text-xs font-bold">{LETTERS[oi]}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between">
        <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="text-sm text-inkMuted hover:text-ink disabled:opacity-30">← Previous</button>
        <div className="flex gap-2">
          {index < questions.length - 1 ? (
            <Button onClick={() => setIndex((i) => i + 1)}>Next →</Button>
          ) : (
            <Button onClick={() => void submitAll()}>Submit exam</Button>
          )}
        </div>
      </div>

      {/* Question dots */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-6 w-6 rounded-full text-xs font-bold transition-colors ${i === index ? 'bg-accent text-white' : answers[i] !== null ? 'bg-accentMuted text-accent' : 'border border-line bg-surface text-inkMuted'}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
