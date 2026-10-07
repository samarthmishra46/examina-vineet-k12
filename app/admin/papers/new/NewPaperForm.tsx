'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  CLASS_LEVELS,
  SUBJECTS_BY_CLASS,
  SUBJECT_LABEL,
  type ClassLevel,
  type Subject,
} from '@/lib/curriculum';

const inputCls =
  'block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentMuted';

export function NewPaperForm() {
  const router = useRouter();
  const [classLevel, setClassLevel] = useState<ClassLevel>(10);
  const [subject, setSubject] = useState<Subject>('maths');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/papers', { method: 'POST', body: new FormData(e.currentTarget) });
      const data = (await res.json()) as { paperId?: string; error?: string };
      if (!res.ok || !data.paperId) throw new Error(data.error ?? 'Upload failed');
      router.push(`/admin/papers/${data.paperId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="kind" className="mb-2 block text-sm font-medium text-ink">
            Paper type
          </label>
          <select id="kind" name="kind" className={inputCls} defaultValue="pyq">
            <option value="pyq">Previous-year board paper</option>
            <option value="sample_paper">Sample paper</option>
          </select>
        </div>
        <div>
          <label htmlFor="year" className="mb-2 block text-sm font-medium text-ink">
            Year
          </label>
          <input
            id="year"
            name="year"
            type="number"
            required
            min={2000}
            max={2100}
            defaultValue={new Date().getFullYear()}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="classLevel" className="mb-2 block text-sm font-medium text-ink">
            Class
          </label>
          <select
            id="classLevel"
            name="classLevel"
            className={inputCls}
            value={classLevel}
            onChange={(e) => {
              const next = Number(e.target.value) as ClassLevel;
              setClassLevel(next);
              setSubject(SUBJECTS_BY_CLASS[next][0] ?? 'maths');
            }}
          >
            {CLASS_LEVELS.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="subject" className="mb-2 block text-sm font-medium text-ink">
            Subject
          </label>
          <select
            id="subject"
            name="subject"
            className={inputCls}
            value={subject}
            onChange={(e) => setSubject(e.target.value as Subject)}
          >
            {SUBJECTS_BY_CLASS[classLevel].map((s) => (
              <option key={s} value={s}>
                {SUBJECT_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="setLabel" className="mb-2 block text-sm font-medium text-ink">
          Set / variant (optional)
        </label>
        <input id="setLabel" name="setLabel" maxLength={60} placeholder="Set 1, Outside Delhi, Basic…" className={inputCls} />
      </div>

      <div>
        <label htmlFor="paper" className="mb-2 block text-sm font-medium text-ink">
          Question paper (PDF)
        </label>
        <input id="paper" name="paper" type="file" accept="application/pdf,.pdf" required className="block w-full text-sm text-ink" />
      </div>
      <div>
        <label htmlFor="answerKey" className="mb-2 block text-sm font-medium text-ink">
          Marking scheme / answer key (PDF, recommended)
        </label>
        <input id="answerKey" name="answerKey" type="file" accept="application/pdf,.pdf" className="block w-full text-sm text-ink" />
        <p className="mt-2 text-xs text-inkMuted">
          Both files together must be 4 MB or less. Without a key, Claude solves the questions
          itself and you must check every answer.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Reading paper… (can take a few minutes)' : 'Extract questions'}
        </Button>
      </div>
    </form>
  );
}
