import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { requireAuth } from '@/lib/auth/helpers';
import { Chapter, Question, Section, connectMongoose } from '@/lib/db/models';

export const metadata: Metadata = { title: 'Speed Drills · Examina' };

export default async function DrillsListPage() {
  await requireAuth();
  await connectMongoose();

  const chapters = await Chapter.find({ status: 'published' }).sort({ updatedAt: -1 }).lean();
  const chapterIds = chapters.map((c) => c._id);
  const sections = await Section.find({ chapterId: { $in: chapterIds } }).sort({ chapterId: 1, order: 1 }).lean();
  const sectionIds = sections.map((s) => s._id);

  const counts = await Question.aggregate([
    { $match: { sectionId: { $in: sectionIds }, flagSuspended: { $ne: true } } },
    { $group: { _id: '$sectionId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((r: { _id: unknown; count: number }) => [r._id!.toString(), r.count as number]));

  const sectionsByChapter = new Map<string, typeof sections>();
  for (const s of sections) {
    const cid = s.chapterId.toString();
    (sectionsByChapter.get(cid) ?? sectionsByChapter.set(cid, []).get(cid)!).push(s);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-inkMuted hover:text-ink">← Dashboard</Link>
      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">🏃 Speed Drills</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-ink">Race the Clock</h1>
        <p className="mt-2 text-sm text-inkMuted">
          60 seconds per question. No diagnosis — just speed. Pick a section.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {chapters.map((ch) => {
          const chSections = sectionsByChapter.get(ch._id.toString()) ?? [];
          return (
            <div key={ch._id.toString()}>
              <h2 className="mb-3 text-sm font-semibold text-ink">{ch.title}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {chSections.map((s) => {
                  const count = countMap.get(s._id.toString()) ?? 0;
                  return (
                    <Link key={s._id.toString()} href={count > 0 ? `/drills/${s._id}` : '#'} className="block">
                      <Card className={`cursor-pointer transition-shadow hover:shadow-md ${count === 0 ? 'opacity-40' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-ink">{s.title}</p>
                            <p className="mt-0.5 text-xs text-inkMuted">{count > 0 ? `${count} questions` : 'No questions yet'}</p>
                          </div>
                          {count > 0 && <span className="text-xs font-bold text-amber-600">GO →</span>}
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
