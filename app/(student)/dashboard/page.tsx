import type { Metadata } from 'next';
import Link from 'next/link';
import { Types } from 'mongoose';
import { Card } from '@/components/ui/Card';
import { JuiceBar } from '@/components/gamification/JuiceBar';
import { requireAuth } from '@/lib/auth/helpers';
import {
  Chapter,
  GameProfile,
  Progress,
  Section,
  StudentProfile,
  connectMongoose,
} from '@/lib/db/models';
import { getLevelFromXP } from '@/lib/xp';

export const metadata: Metadata = {
  title: 'Dashboard · Examina',
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

  const uid = new Types.ObjectId(user.id);

  const [chapters, gameProfile, studentProfile] = await Promise.all([
    Chapter.find({ status: 'published' }).sort({ updatedAt: -1 }).lean(),
    GameProfile.findOne({ userId: uid }).lean(),
    StudentProfile.findOne({ userId: uid }).lean(),
  ]);

  const chapterIds = chapters.map((c) => c._id);
  const [sections, progressDocs] = await Promise.all([
    Section.find({ chapterId: { $in: chapterIds } }).select('_id chapterId').lean(),
    Progress.find({ userId: uid }).lean(),
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

  const firstName = studentProfile?.firstName ?? user.name?.split(' ')[0] ?? 'there';
  const xp = gameProfile?.xp ?? 0;
  const streakDays = gameProfile?.streakDays ?? 0;
  const level = getLevelFromXP(xp);

  const classLabel = studentProfile ? `Class ${studentProfile.class} · ${studentProfile.board}` : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-inkMuted">
            {classLabel ?? 'Welcome back'}
          </p>
          <h1 className="mt-1 font-display text-4xl tracking-tight text-ink">
            Hey {firstName} 👋
          </h1>
          {streakDays >= 2 && (
            <p className="mt-2 text-sm font-medium text-amber-600">
              🔥 {streakDays}-day streak — keep it going!
            </p>
          )}
        </div>
        <div className="hidden flex-col items-end gap-1 sm:flex">
          <span className="text-2xl font-bold text-ink">{xp.toLocaleString()}</span>
          <span className="text-xs text-inkMuted">Total XP · Level {level}</span>
        </div>
      </div>

      {/* Chapters */}
      <div className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-inkMuted uppercase">Chapters</h2>
          <span className="text-xs text-inkMuted">{chapters.length} available</span>
        </div>

        {chapters.length === 0 ? (
          <Card>
            <p className="text-sm text-inkMuted">
              No chapters available yet — ask your admin to add some.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
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
                    <Card className="cursor-pointer transition-shadow hover:shadow-md">
                      <div className="flex items-start justify-between gap-6">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-semibold text-ink">
                            {chapter.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm text-inkMuted">
                            {chapter.description}
                          </p>
                          <div className="mt-4 flex items-center gap-4">
                            <div className="h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-accentMuted">
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
                        <div className="flex flex-col items-end gap-2">
                          <StatusPill status={chapterStatus} />
                        </div>
                      </div>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Juice Bar — rewards that unlock with level */}
      <JuiceBar level={level} />
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
