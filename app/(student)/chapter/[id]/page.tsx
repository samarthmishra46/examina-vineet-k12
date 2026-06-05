import type { Metadata } from 'next';
import { Types, isValidObjectId } from 'mongoose';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { requireAuth } from '@/lib/auth/helpers';
import { Chapter, Progress, Section, connectMongoose } from '@/lib/db/models';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  if (!isValidObjectId(params.id)) return { title: 'Chapter · Examina' };
  await connectMongoose();
  const chapter = await Chapter.findById(params.id).select('title').lean();
  return { title: chapter ? `${chapter.title} · Examina` : 'Chapter · Examina' };
}

type SectionStatus = 'not_started' | 'in_progress' | 'completed';

export default async function ChapterRoadmapPage({ params }: { params: { id: string } }) {
  if (!isValidObjectId(params.id)) redirect('/dashboard');

  const user = await requireAuth();
  await connectMongoose();

  const chapter = await Chapter.findById(params.id).lean();
  if (!chapter || chapter.status !== 'published') redirect('/dashboard');

  const sections = await Section.find({ chapterId: chapter._id }).sort({ order: 1 }).lean();
  const progressDocs = await Progress.find({
    userId: new Types.ObjectId(user.id),
    sectionId: { $in: sections.map((s) => s._id) },
  }).lean();

  const progressBySection = new Map<string, SectionStatus>();
  for (const p of progressDocs) {
    progressBySection.set(p.sectionId.toString(), p.status as SectionStatus);
  }

  const total = sections.length;
  const completed = sections.filter((s) => progressBySection.get(s._id.toString()) === 'completed').length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  // Next section to work on: first in-progress, then first not-started
  const nextSection =
    sections.find((s) => progressBySection.get(s._id.toString()) === 'in_progress') ??
    sections.find((s) => (progressBySection.get(s._id.toString()) ?? 'not_started') === 'not_started');

  const totalMinutes = sections.reduce((sum, s) => sum + (s.estimatedMinutes ?? 5), 0);
  const remainingMinutes = sections
    .filter((s) => progressBySection.get(s._id.toString()) !== 'completed')
    .reduce((sum, s) => sum + (s.estimatedMinutes ?? 5), 0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Breadcrumb */}
      <Link href="/dashboard" className="text-sm text-inkMuted hover:text-ink transition-colors">
        ← All chapters
      </Link>

      {/* Chapter header */}
      <div className="mt-6">
        <h1 className="font-display text-4xl tracking-tight text-ink">{chapter.title}</h1>
        {chapter.description && (
          <p className="mt-2 text-base leading-relaxed text-inkMuted">{chapter.description}</p>
        )}

        {/* Progress bar */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-inkMuted">
            <span>{completed} of {total} sections complete</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-accentMuted">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-inkMuted">
            {completed === total
              ? '✓ Chapter complete!'
              : `~${remainingMinutes} min remaining · ${totalMinutes} min total`}
          </p>
        </div>
      </div>

      {/* Continue CTA */}
      {nextSection && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-accent/30 bg-accentMuted/40 px-5 py-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-accent uppercase tracking-wide">
              {progressBySection.get(nextSection._id.toString()) === 'in_progress' ? 'Continue where you left off' : 'Up next'}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-ink truncate">{nextSection.title}</p>
          </div>
          <Link
            href={`/learn/${nextSection._id}`}
            className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accentHover transition-colors"
          >
            {progressBySection.get(nextSection._id.toString()) === 'in_progress' ? 'Resume →' : 'Start →'}
          </Link>
        </div>
      )}

      {/* Section list */}
      <div className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-inkMuted">
          All sections
        </h2>

        {sections.length === 0 ? (
          <Card>
            <p className="text-sm text-inkMuted">No sections yet.</p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {sections.map((section) => {
              const sid = section._id.toString();
              const status = progressBySection.get(sid) ?? 'not_started';
              const isDone = status === 'completed';

              return (
                <li key={sid}>
                  <div className={`rounded-xl border bg-surface px-5 py-4 transition-shadow hover:shadow-sm ${isDone ? 'border-accent/20 bg-accentMuted/20' : 'border-line'}`}>
                    <div className="flex items-start gap-4">
                      {/* Status dot */}
                      <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${isDone ? 'bg-accent' : status === 'in_progress' ? 'border-2 border-accent bg-accentMuted' : 'border-2 border-line bg-surface'}`} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold ${isDone ? 'text-inkMuted line-through' : 'text-ink'}`}>
                              {String(section.order).padStart(2, '0')} · {section.title}
                            </p>
                            {section.description && (
                              <p className="mt-0.5 line-clamp-1 text-xs text-inkMuted">{section.description}</p>
                            )}
                          </div>
                          <span className="shrink-0 text-xs text-inkMuted">~{section.estimatedMinutes ?? 5}m</span>
                        </div>

                        {/* Action links */}
                        <div className="mt-2.5 flex items-center gap-3">
                          <Link
                            href={`/learn/${sid}`}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${isDone ? 'border border-line text-inkMuted hover:border-accent hover:text-accent' : 'bg-accent text-white hover:bg-accentHover'}`}
                          >
                            {isDone ? 'Revisit lesson' : status === 'in_progress' ? 'Resume lesson' : 'Start lesson'}
                          </Link>
                          <Link
                            href={`/practice/${sid}`}
                            className="rounded-full border border-line px-3 py-1 text-xs font-medium text-inkMuted hover:border-accent hover:text-accent transition-colors"
                          >
                            Practice
                          </Link>
                          {isDone && (
                            <Link
                              href={`/flashcards`}
                              className="rounded-full border border-line px-3 py-1 text-xs font-medium text-inkMuted hover:border-accent hover:text-accent transition-colors"
                            >
                              Flash cards
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
