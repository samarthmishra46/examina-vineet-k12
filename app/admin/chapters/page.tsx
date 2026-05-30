import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chapter, connectMongoose } from '@/lib/db/models';

export const metadata: Metadata = {
  title: 'Chapters · Admin · Examina',
};

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function AdminChaptersPage() {
  await connectMongoose();
  const chapters = await Chapter.find().sort({ updatedAt: -1 }).lean();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-inkMuted">Admin</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">Chapters</h1>
        </div>
        <Link href="/admin/chapters/new">
          <Button>New chapter</Button>
        </Link>
      </div>

      {chapters.length === 0 ? (
        <Card className="mt-10">
          <p className="text-sm text-inkMuted">
            No chapters yet. Upload a PDF or paste text to create your first one.
          </p>
        </Card>
      ) : (
        <ul className="mt-10 space-y-3">
          {chapters.map((chapter) => {
            const id = chapter._id.toString();
            const isPublished = chapter.status === 'published';
            return (
              <li key={id}>
                <Link href={`/admin/chapters/${id}/edit`} className="block">
                  <Card className="cursor-pointer">
                    <div className="flex items-start justify-between gap-6">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-ink">
                          {chapter.title}
                        </h2>
                        <p className="mt-1 line-clamp-2 text-sm text-inkMuted">
                          {chapter.description}
                        </p>
                        <p className="mt-3 text-xs text-inkMuted">
                          Updated {formatDate(chapter.updatedAt as unknown as Date)}
                        </p>
                      </div>
                      <span
                        className={
                          isPublished
                            ? 'rounded-full bg-accentMuted px-3 py-1 text-xs font-medium text-accent'
                            : 'rounded-full border border-line px-3 py-1 text-xs font-medium text-inkMuted'
                        }
                      >
                        {isPublished ? 'Published' : 'Draft'}
                      </span>
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
