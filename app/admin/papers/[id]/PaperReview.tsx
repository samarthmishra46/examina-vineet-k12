'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  deletePaper,
  deletePaperQuestion,
  publishPaper,
  updatePaperQuestion,
} from '@/lib/actions/papers';

export interface ReviewQuestion {
  id: string;
  questionNo: number;
  type: string;
  marks: number;
  context: string;
  text: string;
  options: string[];
  correctIndex: number | null;
  solution: string;
  markingScheme: string[];
  sectionId: string;
  hasFigure: boolean;
  answerFromKey: boolean;
  pending: boolean;
}

const fieldCls =
  'block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentMuted';

export function PaperReview({
  paperId,
  published,
  hasAnswerKey,
  sections,
  initialQuestions,
}: {
  paperId: string;
  published: boolean;
  hasAnswerKey: boolean;
  sections: { id: string; label: string }[];
  initialQuestions: ReviewQuestion[];
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const unmapped = questions.filter((q) => !q.sectionId).length;
  const aiAnswered = questions.filter((q) => !q.answerFromKey).length;
  const figures = questions.filter((q) => q.hasFigure).length;

  function onRemove(id: string) {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  }

  function publish() {
    setError(null);
    startTransition(async () => {
      try {
        await publishPaper(paperId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Publish failed');
      }
    });
  }

  function removePaper() {
    if (!confirm('Delete this paper and all its questions?')) return;
    startTransition(async () => {
      await deletePaper(paperId);
      router.push('/admin/papers');
    });
  }

  return (
    <div className="mt-8 space-y-5">
      <Card>
        <p className="text-sm text-ink">
          {questions.length} questions · {unmapped} without a section · {figures} depend on a figure ·{' '}
          {aiAnswered} answered by Claude (not from a key)
        </p>
        {!hasAnswerKey && !published && (
          <p className="mt-2 text-sm text-danger">
            No answer key was uploaded, so every answer below was solved by Claude. Verify each one.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex gap-3">
          {!published && (
            <Button onClick={publish} disabled={pending || questions.length === 0}>
              {pending ? 'Working…' : 'Publish to students'}
            </Button>
          )}
          <Button variant="ghost" onClick={removePaper} disabled={pending}>
            Delete paper
          </Button>
        </div>
      </Card>

      {questions.map((q) => (
        <QuestionEditor key={q.id} q={q} sections={sections} onRemove={onRemove} />
      ))}
    </div>
  );
}

function QuestionEditor({
  q,
  sections,
  onRemove,
}: {
  q: ReviewQuestion;
  sections: { id: string; label: string }[];
  onRemove: (id: string) => void;
}) {
  const written = q.type === 'short' || q.type === 'long';
  const [text, setText] = useState(q.text);
  const [options, setOptions] = useState(q.options.length === 4 ? q.options : ['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState<number | null>(q.correctIndex);
  const [marks, setMarks] = useState(q.marks);
  const [solution, setSolution] = useState(q.solution);
  const [scheme, setScheme] = useState(q.markingScheme.join('\n'));
  const [sectionId, setSectionId] = useState(q.sectionId);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setStatus('saving');
    setErr(null);
    try {
      await updatePaperQuestion(q.id, {
        text,
        marks,
        solution,
        sectionId: sectionId || null,
        hasFigure: q.hasFigure,
        ...(written
          ? { markingScheme: scheme.split('\n').map((l) => l.trim()).filter(Boolean) }
          : { options, correctIndex }),
      });
      setStatus('saved');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
      setStatus('error');
    }
  }

  async function remove() {
    if (!confirm(`Delete Q${q.questionNo}?`)) return;
    try {
      await deletePaperQuestion(q.id);
      onRemove(q.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const dirtyHint = status === 'saved' ? '✓ Saved' : status === 'saving' ? 'Saving…' : '';

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-ink">Q{q.questionNo}</span>
        <span className="text-inkMuted">{q.type.replace('_', ' ')}</span>
        <label className="flex items-center gap-1 text-inkMuted">
          <input
            type="number"
            min={1}
            max={6}
            value={marks}
            onChange={(e) => setMarks(Number(e.target.value))}
            className="w-14 rounded border border-line bg-surface px-1 py-0.5 text-ink"
            disabled={!q.pending}
          />
          marks
        </label>
        {q.hasFigure && (
          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-danger">
            depends on a figure — describe it in the text or delete
          </span>
        )}
        {!q.answerFromKey && (
          <span className="rounded-full border border-line px-2 py-0.5 text-inkMuted">
            answer by Claude — verify
          </span>
        )}
      </div>

      {q.context && (
        <p className="mt-3 whitespace-pre-wrap rounded-md bg-accentMuted/40 p-3 text-sm text-ink">
          {q.context}
        </p>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className={`${fieldCls} mt-3`}
        disabled={!q.pending}
      />

      {written ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-inkMuted">Marking scheme (one point per line)</p>
            <textarea
              value={scheme}
              onChange={(e) => setScheme(e.target.value)}
              rows={5}
              className={fieldCls}
              disabled={!q.pending}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-inkMuted">Model answer</p>
            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              rows={5}
              className={fieldCls}
              disabled={!q.pending}
            />
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${q.id}`}
                checked={correctIndex === i}
                onChange={() => setCorrectIndex(i)}
                disabled={!q.pending}
                aria-label={`Option ${i + 1} is correct`}
              />
              <input
                value={opt}
                onChange={(e) => setOptions((o) => o.map((x, j) => (j === i ? e.target.value : x)))}
                className={fieldCls}
                disabled={!q.pending}
              />
            </div>
          ))}
          <p className="text-xs text-inkMuted">Select the radio next to the correct option.</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className={`${fieldCls} max-w-md`}
          disabled={!q.pending}
        >
          <option value="">— choose section —</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        {q.pending && (
          <>
            <Button size="md" onClick={save} disabled={status === 'saving'}>
              Save
            </Button>
            <button type="button" onClick={remove} className="text-xs text-inkMuted hover:text-danger">
              Delete
            </button>
          </>
        )}
        <span className="text-xs text-inkMuted">{dirtyHint}</span>
        {err && <span className="text-xs text-danger">{err}</span>}
      </div>
    </Card>
  );
}
