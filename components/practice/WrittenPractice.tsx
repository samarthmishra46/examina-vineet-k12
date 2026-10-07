'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface WrittenQuestion {
  _id: string;
  text: string;
  type: 'short' | 'long';
  marks: number;
  difficulty: 1 | 2 | 3;
  timeExpectedSeconds: number;
}

interface GradeResponse {
  marksAwarded: number;
  maxMarks: number;
  pointsEarned: string[];
  pointsMissed: string[];
  feedback: string;
  modelAnswer: string;
  markingScheme: string[];
}

export function WrittenPractice({ sectionId }: { sectionId: string }) {
  const [questions, setQuestions] = useState<WrittenQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [totals, setTotals] = useState({ got: 0, max: 0 });
  const startedAt = useRef(Date.now());

  useEffect(() => {
    fetch(`/api/practice/questions?sectionId=${sectionId}&kind=written`)
      .then((r) => r.json())
      .then((data: { questions?: WrittenQuestion[]; error?: string }) => {
        if (data.error || !data.questions?.length) {
          setLoadError(data.error ?? 'No written questions yet. Ask your admin to generate them.');
        } else {
          setQuestions(data.questions);
          startedAt.current = Date.now();
        }
      })
      .catch(() => setLoadError('Could not load questions.'))
      .finally(() => setLoading(false));
  }, [sectionId]);

  const question = questions[index];

  async function submit() {
    if (!question) return;
    setGrading(true);
    setGradeError(null);
    try {
      const res = await fetch('/api/practice/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question._id,
          answerText: answer,
          timeTakenSeconds: Math.round((Date.now() - startedAt.current) / 1000),
        }),
      });
      const data = (await res.json()) as GradeResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Grading failed');
      setResult(data);
      setTotals((t) => ({ got: t.got + data.marksAwarded, max: t.max + data.maxMarks }));
    } catch (e) {
      setGradeError(e instanceof Error ? e.message : 'Grading failed');
    } finally {
      setGrading(false);
    }
  }

  function next() {
    setAnswer('');
    setResult(null);
    setGradeError(null);
    setIndex((i) => i + 1);
    startedAt.current = Date.now();
  }

  if (loading) return <p className="text-sm text-inkMuted">Loading questions…</p>;
  if (loadError) {
    return (
      <Card>
        <p className="text-sm text-inkMuted">{loadError}</p>
      </Card>
    );
  }
  if (!question) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-ink">Section done</h2>
        <p className="mt-2 text-sm text-inkMuted">
          You scored {totals.got} / {totals.max} marks on written questions.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs text-inkMuted">
        <span>
          Question {index + 1} of {questions.length} · {question.type === 'long' ? 'Long' : 'Short'}{' '}
          answer
        </span>
        <span>
          Score so far: {totals.got} / {totals.max}
        </span>
      </div>

      <Card>
        <p className="text-xs font-medium text-accent">
          {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-ink">
          {question.text}
        </p>
      </Card>

      {!result ? (
        <>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={question.type === 'long' ? 12 : 7}
            maxLength={4000}
            disabled={grading}
            placeholder="Write your answer the way you would in the board exam: given, formula, steps, final answer."
            className="block w-full rounded-md border border-line bg-surface p-3 text-sm leading-relaxed text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentMuted"
          />
          {gradeError && <p className="text-sm text-danger">{gradeError}</p>}
          <Button onClick={submit} disabled={grading || answer.trim().length < 10}>
            {grading ? 'Marking your answer…' : 'Submit for marking'}
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <Card>
            <p className="text-2xl font-semibold text-ink">
              {result.marksAwarded} / {result.maxMarks}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink">{result.feedback}</p>
            {result.pointsEarned.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink">
                {result.pointsEarned.map((p) => (
                  <li key={p}>✓ {p}</li>
                ))}
              </ul>
            )}
            {result.pointsMissed.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-inkMuted">
                {result.pointsMissed.map((p) => (
                  <li key={p}>✗ {p}</li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <p className="text-xs font-medium tracking-wide text-inkMuted">Model answer</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {result.modelAnswer}
            </p>
          </Card>
          <Button onClick={next}>{index + 1 < questions.length ? 'Next question' : 'Finish'}</Button>
        </div>
      )}
    </div>
  );
}
