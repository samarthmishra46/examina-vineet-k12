import type { Metadata } from 'next';
import Link from 'next/link';
import { Types } from 'mongoose';
import { Card } from '@/components/ui/Card';
import { requireAuth } from '@/lib/auth/helpers';
import { Chapter, Progress, Section, connectMongoose } from '@/lib/db/models';

export const metadata: Metadata = {
  title: 'Your chapters · Examina',
};

type ChapterStatus = 'not_started' | 'in_progress' | 'completed';

function deriveChapterStatus(total: number, completed: number, inProgress: number): ChapterStatus {
  if (total === 0) return 'not_started';
  if (completed === total) return 'completed';
  if (completed === 0 && inProgress === 0) return 'not_started';
  return 'in_progress';
}

export default async function DashboardPage() {
  const user = await requireAuth();
  await connectMongoose();

  const chapters = await Chapter.find({ status: 'published' }).sort({ updatedAt: -1 }).lean();
  const chapterIds = chapters.map((c) => c._id);

  const [sections, progressDocs] = await Promise.all([
    Section.find({ chapterId: { $in: chapterIds } }).select('_id chapterId').lean(),
    Progress.find({ userId: new Types.ObjectId(user.id) }).lean(),
  ]);

  const sectionsByChapter = new Map<string, string[]>();
  for (const s of sections) {
    const cid = s.chapterId.toString();
    const list = sectionsByChapter.get(cid) ?? [];
    list.push(s._id.toString());
    sectionsByChapter.set(cid, list);
  }

  const progressBySection = new Map<string, ChapterStatus>();
  for (const p of progressDocs) {
    progressBySection.set(p.sectionId.toString(), p.status as ChapterStatus);
  }

  const firstName = user.name?.split(' ')[0] ?? 'there';

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-inkMuted">Welcome back, {firstName}</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">Your chapters</h1>

      {chapters.length === 0 ? (
        <Card className="mt-10">
          <p className="text-sm text-inkMuted">
            No chapters available yet. Check back soon.
          </p>
        </Card>
      ) : (
        <ul className="mt-10 space-y-3">
          {chapters.map((chapter) => {
            const id = chapter._id.toString();
            const sectionIds = sectionsByChapter.get(id) ?? [];
            const total = sectionIds.length;
            let completed = 0;
            let inProgress = 0;
            for (const sid of sectionIds) {
              const status = progressBySection.get(sid);
              if (status === 'completed') completed++;
              else if (status === 'in_progress') inProgress++;
            }
            const chapterStatus = deriveChapterStatus(total, completed, inProgress);
            const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

            return (
              <li key={id}>
                <Link href={`/chapter/${id}`} className="block">
                  <Card className="cursor-pointer">
                    <div className="flex items-start justify-between gap-6">
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-semibold text-ink">
                          {chapter.title}
                        </h2>
                        <p className="mt-1 line-clamp-2 text-sm text-inkMuted">
                          {chapter.description}
                        </p>
                        <div className="mt-4 flex items-center gap-4">
                          <div className="h-1 w-40 max-w-full overflow-hidden rounded-full bg-accentMuted">
                            <div
                              className="h-full rounded-full bg-accent transition-all duration-std ease-std"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-inkMuted">
                            {completed} of {total} done
                          </span>
                        </div>
                      </div>
                      <StatusPill status={chapterStatus} />
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: ChapterStatus }) {
  if (status === 'completed') {
    return (
      <span className="rounded-full bg-accentMuted px-3 py-1 text-xs font-medium text-accent">
        Completed
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span className="rounded-full border border-accent/30 px-3 py-1 text-xs font-medium text-accent">
        In progress
      </span>
    );
  }
  return (
    <span className="rounded-full border border-line px-3 py-1 text-xs font-medium text-inkMuted">
      Not started
    </span>
  );
}
