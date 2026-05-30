import type { Metadata } from 'next';
import { NewChapterForm } from './NewChapterForm';

export const metadata: Metadata = {
  title: 'New chapter · Admin · Examina',
};

export default function NewChapterPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-inkMuted">Admin / Chapters</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">New chapter</h1>
      <p className="mt-3 text-inkMuted">
        Provide the chapter source and we&apos;ll draft a section roadmap with Claude. You can edit
        everything before publishing.
      </p>
      <div className="mt-10">
        <NewChapterForm />
      </div>
    </div>
  );
}
