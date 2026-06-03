import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { requireAuth } from '@/lib/auth/helpers';
import { Chapter, Question, Section, connectMongoose } from '@/lib/db/models';

export const metadata: Metadata = { title: 'Past Year Questions · Examina' };

export default async function PYQPage() {
  await requireAuth();
  await connectMongoose();

  const chapters = await Chapter.find({ status: 'published' }).sort({ updatedAt: -1 }).lean();
  const chapterIds = chapters.map((c) => c._id);

  const sections = await Section.find({ chapterId: { $in: chapterIds } }).select('_id chapterId').lean();
  const sectionIds = sections.map((s) => s._id);

  const hardCounts = await Question.aggregate([
    { $match: { sectionId: { $in: sectionIds }, difficulty: 3, flagSuspended: { $ne: true } } },
    { $group: { _id: '$sectionId', count: { $sum: 1 } } },
  ]);

  const countBySection = new Map(hardCounts.map((r: { _id: unknown; count: number }) => [r._id!.toString(), r.count as number]));
  const countByChapter = new Map<string, number>();
  for (const s of sections) {
    const c = countBySection.get(s._id.toString()) ?? 0;
    countByChapter.set(s.chapterId.toString(), (countByChapter.get(s.chapterId.toString()) ?? 0) + c);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-inkMuted hover:text-ink">← Dashboard</Link>
      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">📚 Past Year Questions</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-ink">Board Exam Pattern</h1>
        <p className="mt-2 text-sm text-inkMuted">
          Hard questions modelled on board and JEE exam style. Pick a chapter.
        </p>
      </div>

      <ul className="mt-8 space-y-3">
        {chapters.map((ch) => {
          const count = countByChapter.get(ch._id.toString()) ?? 0;
          return (
            <li key={ch._id.toString()}>
              <Link href={`/pyq/${ch._id}`} className="block">
                <Card className={`cursor-pointer transition-shadow hover:shadow-md ${count === 0 ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-ink">{ch.title}</p>
                      <p className="mt-0.5 text-xs text-inkMuted">
                        {count > 0 ? `${count} exam-pattern questions` : 'Generate practice questions first'}
                      </p>
                    </div>
                    {count > 0 && <span className="text-sm text-accent">Practice →</span>}
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
