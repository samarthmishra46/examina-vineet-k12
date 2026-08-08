'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { createChapter, createChaptersFromPdfs } from '@/lib/actions/chapters';
import { cn } from '@/lib/utils';

type SourceTab = 'text' | 'pdf' | 'batch';

const NCERT_CLASSES = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
const NCERT_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Political Science', 'Economics', 'Accountancy', 'Business Studies'];

interface BatchResult {
  name: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

export function NewChapterForm() {
  const [tab, setTab] = useState<SourceTab>('pdf');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Batch state
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchClass, setBatchClass] = useState('Class 12');
  const [batchSubject, setBatchSubject] = useState('Physics');
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);
    formData.set('sourceType', tab);
    try {
      await createChapter(formData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      if (message === 'NEXT_REDIRECT' || /NEXT_REDIRECT/.test(message)) return;
      setError(message);
      setSubmitting(false);
    }
  }

  const BATCH_CONCURRENCY = 3;

  async function handleBatchUpload() {
    if (batchFiles.length === 0) return;
    setBatchRunning(true);

    const initial: BatchResult[] = batchFiles.map((f) => ({ name: f.name, status: 'pending' }));
    setBatchResults(initial);

    async function processOne(index: number) {
      const file = batchFiles[index]!;
      setBatchResults((prev) => prev.map((r, idx) => idx === index ? { ...r, status: 'processing' } : r));
      try {
        const fd = new FormData();
        fd.set('file', file);
        fd.set('ncertClass', batchClass);
        fd.set('ncertSubject', batchSubject);
        await createChaptersFromPdfs(fd);
        setBatchResults((prev) => prev.map((r, idx) => idx === index ? { ...r, status: 'done' } : r));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed';
        if (/NEXT_REDIRECT/.test(msg)) {
          setBatchResults((prev) => prev.map((r, idx) => idx === index ? { ...r, status: 'done' } : r));
        } else {
          setBatchResults((prev) => prev.map((r, idx) => idx === index ? { ...r, status: 'error', error: msg } : r));
        }
      }
    }

    // Process files with bounded concurrency instead of one-at-a-time —
    // cuts a 10-chapter batch from ~10x roadmap-generation time down to ~4x.
    let cursor = 0;
    async function worker() {
      while (cursor < batchFiles.length) {
        const i = cursor++;
        await processOne(i);
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(BATCH_CONCURRENCY, batchFiles.length) }, worker),
    );

    setBatchRunning(false);
  }

  return (
    <div className="space-y-6">
      {/* Source type tabs */}
      <div>
        <p className="mb-3 text-sm font-medium text-ink">Create chapter from</p>
        <div className="inline-flex rounded-full border border-line bg-surface p-1">
          <TabButton active={tab === 'pdf'} onClick={() => setTab('pdf')}>Upload PDF</TabButton>
          <TabButton active={tab === 'text'} onClick={() => setTab('text')}>Paste text</TabButton>
          <TabButton active={tab === 'batch'} onClick={() => setTab('batch')}>Batch PDFs</TabButton>
        </div>
      </div>

      {/* ── Single PDF / Text form ── */}
      {tab !== 'batch' && (
        <form action={handleSubmit} className="space-y-5">
          <Field label="Chapter title" name="title" required maxLength={200} placeholder="Electric Charges and Fields" />
          <Field label="Description" name="description" required maxLength={500} placeholder="A brief student-friendly summary of this chapter." />

          {/* NCERT metadata */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">NCERT Class</label>
              <select name="ncertClass" defaultValue="Class 12"
                className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink">
                <option value="">— optional —</option>
                {NCERT_CLASSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Subject</label>
              <select name="ncertSubject" defaultValue="Physics"
                className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink">
                <option value="">— optional —</option>
                {NCERT_SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Exam weight %</label>
              <input name="examWeightPct" type="number" min="0" max="100" defaultValue="0"
                className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink" />
            </div>
          </div>

          {/* Source content */}
          {tab === 'text' ? (
            <div>
              <label htmlFor="sourceContent" className="mb-2 block text-sm font-medium text-ink">Chapter text</label>
              <textarea id="sourceContent" name="sourceContent" required rows={14} minLength={500}
                placeholder="Paste the full chapter text here. At least 500 characters."
                className="block w-full rounded-md border border-line bg-surface p-3 text-sm leading-relaxed text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentMuted" />
              <p className="mt-2 text-xs text-inkMuted">Minimum 500 characters.</p>
            </div>
          ) : (
            <div>
              <label htmlFor="file" className="mb-2 block text-sm font-medium text-ink">PDF file</label>
              <input id="file" name="file" type="file" accept="application/pdf,.pdf" required
                className="block w-full text-sm text-ink file:mr-4 file:rounded-full file:border-0 file:bg-accentMuted file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent hover:file:bg-accentMuted/80" />
              <p className="mt-2 text-xs text-inkMuted">Up to 10 MB. Text-based PDFs only.</p>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? 'Generating roadmap… (up to 30s)' : 'Generate roadmap'}
            </Button>
            {submitting && <p className="text-sm text-inkMuted">Claude is breaking the chapter into sections.</p>}
          </div>
        </form>
      )}

      {/* ── Batch upload ── */}
      {tab === 'batch' && (
        <div className="space-y-5">
          <p className="text-sm text-inkMuted">
            Upload multiple NCERT chapter PDFs at once. Each PDF will become a separate chapter with an AI-generated roadmap.
          </p>

          {/* Shared metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">NCERT Class (all PDFs)</label>
              <select value={batchClass} onChange={(e) => setBatchClass(e.target.value)}
                className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink">
                {NCERT_CLASSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Subject (all PDFs)</label>
              <select value={batchSubject} onChange={(e) => setBatchSubject(e.target.value)}
                className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink">
                {NCERT_SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* File picker */}
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Select chapter PDFs</label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={(e) => setBatchFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-sm text-ink file:mr-4 file:rounded-full file:border-0 file:bg-accentMuted file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent hover:file:bg-accentMuted/80"
            />
            {batchFiles.length > 0 && (
              <p className="mt-1.5 text-xs text-inkMuted">{batchFiles.length} file(s) selected</p>
            )}
          </div>

          <Button
            size="lg"
            disabled={batchFiles.length === 0 || batchRunning}
            onClick={() => void handleBatchUpload()}
          >
            {batchRunning ? 'Processing…' : `Upload ${batchFiles.length > 0 ? batchFiles.length : ''} chapter${batchFiles.length !== 1 ? 's' : ''}`}
          </Button>

          {/* Progress list */}
          {batchResults.length > 0 && (
            <div className="space-y-2">
              {batchResults.map((r) => (
                <div key={r.name} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm">
                  <span className={cn('shrink-0 text-base', {
                    'text-inkMuted': r.status === 'pending',
                    'text-amber-500 animate-pulse': r.status === 'processing',
                    'text-green-500': r.status === 'done',
                    'text-danger': r.status === 'error',
                  })}>
                    {r.status === 'pending' ? '⏳' : r.status === 'processing' ? '⚙️' : r.status === 'done' ? '✓' : '✗'}
                  </span>
                  <span className="flex-1 truncate font-mono text-xs text-inkMuted">{r.name}</span>
                  <span className="shrink-0 text-xs text-inkMuted capitalize">
                    {r.status === 'error' ? r.error : r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, name, required, maxLength, placeholder }: {
  label: string; name: string; required?: boolean; maxLength?: number; placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-medium text-ink">{label}</label>
      <input id={name} name={name} type="text" required={required} maxLength={maxLength} placeholder={placeholder}
        className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accentMuted" />
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-accent text-white' : 'text-inkMuted hover:text-ink')}>
      {children}
    </button>
  );
}
