import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { requireAuth } from '@/lib/auth/helpers';
import { Chapter, Section, connectMongoose } from '@/lib/db/models';

export const metadata: Metadata = { title: '"Why This Works" Deep Dives · Examina' };

export default async function DeepDivePage() {
  await requireAuth();
  await connectMongoose();

  const chapters = await Chapter.find({ status: 'published' }).sort({ updatedAt: -1 }).lean();
  const chapterIds = chapters.map((c) => c._id);
  const sections = await Section.find({ chapterId: { $in: chapterIds } }).sort({ chapterId: 1, order: 1 }).lean();

  const sectionsByChapter = new Map<string, typeof sections>();
  for (const s of sections) {
    const cid = s.chapterId.toString();
    (sectionsByChapter.get(cid) ?? sectionsByChapter.set(cid, []).get(cid)!).push(s);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-inkMuted hover:text-ink">← Dashboard</Link>
      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">🔬 Deep Dives</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-ink">
          Why This Works
        </h1>
        <p className="mt-2 text-sm text-inkMuted">
          Aryan Sir goes beyond the syllabus — derivations, history, and the real story behind every formula.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {chapters.map((ch) => {
          const chSections = sectionsByChapter.get(ch._id.toString()) ?? [];
          return (
            <div key={ch._id.toString()}>
              <h2 className="mb-3 text-sm font-semibold text-ink">{ch.title}</h2>
              <div className="space-y-2">
                {chSections.map((s) => (
                  <Link key={s._id.toString()} href={`/deepdive/${s._id}`} className="block">
                    <Card className="cursor-pointer transition-shadow hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-ink">{s.title}</p>
                          <p className="mt-0.5 text-xs text-inkMuted">~15 min deep dive</p>
                        </div>
                        <span className="text-sm text-accent">Dive in →</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
