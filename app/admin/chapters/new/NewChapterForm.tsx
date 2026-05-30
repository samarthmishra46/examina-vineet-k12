'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { createChapter } from '@/lib/actions/chapters';
import { cn } from '@/lib/utils';

type SourceTab = 'text' | 'pdf';

export function NewChapterForm() {
  const [tab, setTab] = useState<SourceTab>('text');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);
    formData.set('sourceType', tab);
    try {
      await createChapter(formData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      // NEXT_REDIRECT errors are thrown intentionally on success — ignore them.
      if (message === 'NEXT_REDIRECT' || /NEXT_REDIRECT/.test(message)) return;
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <Field label="Title" name="title" required maxLength={200} placeholder="Quadratic Equations" />
      <Field
        label="Description"
        name="description"
        required
        maxLength={500}
        placeholder="A short, student-friendly summary of what this chapter covers."
      />

      <div>
        <p className="mb-3 text-sm font-medium text-ink">Source</p>
        <div className="inline-flex rounded-full border border-line bg-surface p-1">
          <TabButton active={tab === 'text'} onClick={() => setTab('text')}>
            Paste text
          </TabButton>
          <TabButton active={tab === 'pdf'} onClick={() => setTab('pdf')}>
            Upload PDF
          </TabButton>
        </div>
      </div>

      {tab === 'text' ? (
        <div>
          <label htmlFor="sourceContent" className="mb-2 block text-sm font-medium text-ink">
            Chapter text
          </label>
          <textarea
            id="sourceContent"
            name="sourceContent"
            required
            rows={14}
            minLength={500}
            placeholder="Paste the full chapter text here. At least 500 characters."
            className="block w-full rounded-md border border-line bg-surface p-3 text-sm leading-relaxed text-ink shadow-sm transition-colors duration-std ease-std focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentMuted"
          />
          <p className="mt-2 text-xs text-inkMuted">
            Minimum 500 characters. Longer chapters produce richer roadmaps.
          </p>
        </div>
      ) : (
        <div>
          <label htmlFor="file" className="mb-2 block text-sm font-medium text-ink">
            PDF file
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept="application/pdf,.pdf"
            required
            className="block w-full text-sm text-ink file:mr-4 file:rounded-full file:border-0 file:bg-accentMuted file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent hover:file:bg-accentMuted/80"
          />
          <p className="mt-2 text-xs text-inkMuted">
            Up to 10 MB. Text-based PDFs only — scanned images without OCR won&apos;t extract.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4 pt-2">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Generating roadmap… (up to 30s)' : 'Generate roadmap'}
        </Button>
        {submitting && (
          <p className="text-sm text-inkMuted">Asking Claude to break this chapter into sections.</p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  maxLength,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm transition-colors duration-std ease-std focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentMuted"
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-std ease-std',
        active ? 'bg-accent text-white' : 'text-inkMuted hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
