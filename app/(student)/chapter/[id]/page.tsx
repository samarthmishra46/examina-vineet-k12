import type { Metadata } from 'next';
import { Types, isValidObjectId } from 'mongoose';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { requireAuth } from '@/lib/auth/helpers';
import { Chapter, Progress, Section, connectMongoose } from '@/lib/db/models';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
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
  const completed = sections.filter(
    (s) => progressBySection.get(s._id.toString()) === 'completed',
  ).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/dashboard"
        className="text-sm text-inkMuted transition-colors duration-std ease-std hover:text-ink"
      >
        ← Your chapters
      </Link>

      <div className="mt-8">
        <h1 className="font-display text-4xl tracking-tight text-ink">{chapter.title}</h1>
        {chapter.description && (
          <p className="mt-3 text-lg leading-relaxed text-inkMuted">{chapter.description}</p>
        )}
        <p className="mt-6 text-sm text-inkMuted">
          {completed} of {total} sections complete
        </p>
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-medium tracking-wide text-inkMuted">Sections</h2>
        {sections.length === 0 ? (
          <Card className="mt-4">
            <p className="text-sm text-inkMuted">This chapter has no sections yet.</p>
          </Card>
        ) : (
          <ul className="mt-4 space-y-3">
            {sections.map((section) => {
              const sid = section._id.toString();
              const status = progressBySection.get(sid) ?? 'not_started';
              return (
                <li key={sid}>
                  <Link href={`/learn/${sid}`} className="block">
                    <Card className="cursor-pointer">
                      <div className="flex items-start gap-5">
                        <span className="mt-0.5 text-sm font-medium tabular-nums text-inkMuted">
                          {String(section.order).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-ink">{section.title}</h3>
                          {section.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-inkMuted">
                              {section.description}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-inkMuted">
                            ~{section.estimatedMinutes ?? 5} min
                          </p>
                        </div>
                        <SectionPill status={status} />
                      </div>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function SectionPill({ status }: { status: SectionStatus }) {
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
