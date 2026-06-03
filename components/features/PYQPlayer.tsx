'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface SafeQuestion {
  _id: string;
  text: string;
  options: string[];
  difficulty: 1 | 2 | 3;
  timeExpectedSeconds: number;
  sectionTitle: string;
}

interface SubmitResult {
  isCorrect: boolean;
  correctIndex: number;
  solution: string;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export function PYQPlayer({ chapterTitle, chapterId, questions }: {
  chapterTitle: string;
  chapterId: string;
  questions: SafeQuestion[];
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const startRef = useRef(Date.now());

  const current = questions[index];

  const submit = useCallback(async (optIdx: number) => {
    if (!current || selected !== null) return;
    setSelected(optIdx);
    const elapsed = Math.round((Date.now() - startRef.current) / 1000);
    const res = await fetch('/api/practice/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: current._id, selectedIndex: optIdx, timeTakenSeconds: elapsed }),
    });
    const data = await res.json() as SubmitResult;
    setResult(data);
    if (data.isCorrect) setCorrect((c) => c + 1);
  }, [current, selected]);

  function next() {
    if (index + 1 >= questions.length) { setDone(true); return; }
    setIndex((i) => i + 1);
    setSelected(null);
    setResult(null);
    startRef.current = Date.now();
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="font-display text-2xl text-ink">No board-pattern questions yet</p>
        <p className="mt-2 text-sm text-inkMuted">Go to admin → edit sections → Generate questions first.</p>
        <Link href="/pyq" className="mt-6 inline-block"><Button variant="ghost">← Back</Button></Link>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((correct / questions.length) * 100);
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="font-display text-3xl text-ink">Board Practice Done</p>
        <p className="mt-3 text-4xl font-bold text-ink">{correct}/{questions.length}</p>
        <p className="text-sm text-inkMuted">{pct}% accuracy on exam-pattern questions</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/pyq"><Button variant="ghost">← More chapters</Button></Link>
          <Button onClick={() => { setIndex(0); setCorrect(0); setSelected(null); setResult(null); setDone(false); startRef.current = Date.now(); }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/pyq" className="text-sm text-inkMuted hover:text-ink">← {chapterTitle}</Link>
        <span className="text-xs text-inkMuted">Q{index + 1} of {questions.length} · Board Pattern</span>
      </header>

      <div className="mb-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-accentMuted">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-0.5 text-xs font-medium text-red-700">
            Hard · Board Pattern
          </span>
          <span className="text-xs text-inkMuted">{current.sectionTitle}</span>
        </div>

        <div className="px-6 py-5">
          <p className="text-base leading-relaxed text-ink">{current.text}</p>
        </div>

        <div className="space-y-2 px-6 pb-6">
          {current.options.map((opt, oi) => {
            const isSelected = selected === oi;
            const isCorrect = result && oi === result.correctIndex;
            const isWrong = result && isSelected && !result.isCorrect;
            let cls = 'w-full flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all ';
            if (!result) cls += isSelected ? 'border-accent bg-accentMuted text-accent' : 'border-line bg-surface text-ink hover:border-accent cursor-pointer';
            else if (isCorrect) cls += 'border-green-400 bg-green-50 text-green-800';
            else if (isWrong) cls += 'border-red-400 bg-red-50 text-red-800';
            else cls += 'border-line bg-surface text-inkMuted/50';
            return (
              <button key={oi} type="button" className={cls} disabled={!!result} onClick={() => submit(oi)}>
                <span className="mt-0.5 shrink-0 text-xs font-bold">{LETTERS[oi]}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {result && (
          <div className={`border-t px-6 py-4 ${result.isCorrect ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}>
            <p className={`text-sm font-semibold ${result.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {result.isCorrect ? 'Correct!' : 'Not quite.'}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm text-ink/80">{result.solution}</p>
            <Button className="mt-3" onClick={next}>
              {index + 1 >= questions.length ? 'See results' : 'Next question →'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
