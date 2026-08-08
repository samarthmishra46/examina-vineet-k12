import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Admin Guide · Examina' };

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accentMuted text-sm font-bold text-accent">
        {n}
      </div>
      <div className="flex-1 space-y-2 pb-8">
        <h3 className="font-semibold text-ink">{title}</h3>
        <div className="space-y-2 text-sm leading-relaxed text-inkMuted">{children}</div>
      </div>
    </div>
  );
}

function Row({ feature, path, source }: { feature: string; path: string; source: string }) {
  return (
    <tr className="border-b border-line last:border-0">
      <td className="py-2.5 pr-4 font-medium text-ink">{feature}</td>
      <td className="py-2.5 pr-4 font-mono text-xs text-accent">{path}</td>
      <td className="py-2.5 text-inkMuted">{source}</td>
    </tr>
  );
}

export default function AdminGuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin/chapters" className="text-sm text-inkMuted hover:text-ink">← All chapters</Link>

      <h1 className="mt-6 font-display text-3xl tracking-tight text-ink">Content Admin Guide</h1>
      <p className="mt-2 text-sm text-inkMuted">
        How to add chapters, questions and mocks — and exactly where each thing shows up for students.
      </p>

      {/* Pipeline */}
      <div className="mt-10">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-inkMuted">The pipeline</h2>
        <div className="mt-4">
          <Step n={1} title="Add a chapter">
            <p>Go to <Link href="/admin/chapters/new" className="text-accent hover:underline">Chapters → + New chapter</Link>. Three ways in:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Paste text</strong> — minimum 500 characters of chapter content.</li>
              <li><strong>Upload PDF</strong> — one chapter, text-based PDF, up to 10 MB (scanned/image-only PDFs won&apos;t extract text).</li>
              <li><strong>Batch PDFs</strong> — multiple chapter PDFs at once, same NCERT class/subject applied to all. Each becomes its own chapter.</li>
            </ul>
            <p>Claude reads the source and generates a section-by-section roadmap (titles, descriptions, learning objectives, estimated minutes) automatically — you don&apos;t write sections by hand.</p>
            <p className="text-amber-700">New chapters start as <strong>Draft</strong> — invisible to students until published (step 4).</p>
          </Step>

          <Step n={2} title="Review / edit the roadmap">
            <p>On a chapter&apos;s edit page you can rename sections, rewrite descriptions and objectives, reorder by drag, add/remove sections, and adjust estimated minutes. Nothing here needs saving to a file — every change writes straight to the database.</p>
          </Step>

          <Step n={3} title="Generate practice questions (feeds Speed Drills + Mock Exam)">
            <p>Same edit page, each section has a <strong>&quot;Gen questions&quot;</strong> button, or use <strong>&quot;Generate questions for N sections missing them&quot;</strong> at the top of the Sections list to batch it for the whole chapter. This calls Claude to write 5–15 MCQs per section.</p>
            <p>This one step is what populates <strong>Speed Drills</strong>, the regular <strong>Practice</strong> mode, and <strong>Mock Exam Mode</strong> — they all read from the same question pool. A section with 0 questions shows &quot;No questions yet&quot; and is unclickable on <code>/drills</code>.</p>
          </Step>

          <Step n={4} title="Publish">
            <p>Click <strong>Publish</strong> at the top of the chapter edit page. Only published chapters (and their sections) are visible anywhere on the student side — dashboard, lessons, drills, cheat sheets, deep dives, mock exam.</p>
          </Step>
        </div>
      </div>

      {/* What's auto-generated */}
      <div className="mt-4 rounded-xl border border-line bg-canvas p-5">
        <h2 className="text-sm font-semibold text-ink">You do NOT need to separately upload these — they self-generate from section content the first time a student opens them:</h2>
        <ul className="mt-3 ml-4 list-disc space-y-1.5 text-sm text-inkMuted">
          <li><strong>Cheat Sheets</strong> — generated per chapter on first student visit (~20s), then cached. To force a refresh after editing a chapter, call <code className="text-xs">DELETE /api/cheatsheets/[chapterId]</code>.</li>
          <li><strong>Flashcards</strong> — generated per section on first visit, then cached permanently.</li>
          <li><strong>Deep Dives (&quot;Why This Works&quot;)</strong> — generated live, per view, from the section&apos;s learning objectives. Nothing to pre-generate.</li>
          <li><strong>Mock Exam Mode</strong> — no separate content; it randomly samples 30 questions across every published chapter&apos;s question pool (step 3).</li>
        </ul>
      </div>

      {/* Where things show up */}
      <div className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-inkMuted">Where each content type appears to students</h2>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas text-left text-xs uppercase tracking-wide text-inkMuted">
                <th className="py-2 pl-4 pr-4 font-medium">Feature</th>
                <th className="py-2 pr-4 font-medium">Student URL</th>
                <th className="py-2 pr-4 font-medium">Needs from admin</th>
              </tr>
            </thead>
            <tbody className="[&_td]:pl-4">
              <Row feature="Chapter overview" path="/chapter/[chapterId]" source="Chapter + sections, published" />
              <Row feature="Lesson (Aryan Sir)" path="/learn/[sectionId]" source="Section, published" />
              <Row feature="Deep Dive" path="/deepdive/[sectionId]" source="Section, published — auto-generated" />
              <Row feature="Cheat Sheet" path="/cheatsheets/[chapterId]" source="Chapter, published — auto-generated" />
              <Row feature="Flashcards" path="/flashcards" source="Section, published — auto-generated" />
              <Row feature="Speed Drills" path="/drills/[sectionId]" source="Questions generated (step 3)" />
              <Row feature="Mock Exam Mode" path="/mock-exam" source="Questions generated, any sections" />
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-line bg-canvas p-5 text-sm text-inkMuted">
        <p><strong className="text-ink">Admin access:</strong> your account needs <code>role: &quot;admin&quot;</code> on its user document in the <code>users</code> collection (MongoDB) — there&apos;s no self-serve promotion flow yet.</p>
      </div>
    </div>
  );
}
