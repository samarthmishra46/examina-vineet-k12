import type { Metadata } from 'next';
import { NewPaperForm } from './NewPaperForm';

export const metadata: Metadata = {
  title: 'Upload paper · Admin · Examina',
};

export default function NewPaperPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-inkMuted">Admin / Papers</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">Upload a board paper</h1>
      <p className="mt-3 text-inkMuted">
        Claude reads the PDF, extracts every question and maps it to a section. Nothing reaches
        students until you review and publish it.
      </p>
      <div className="mt-10">
        <NewPaperForm />
      </div>
    </div>
  );
}
