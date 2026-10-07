import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Paper, Question, connectMongoose } from '@/lib/db/models';

export const metadata: Metadata = {
  title: 'Papers · Admin · Examina',
};

export default async function AdminPapersPage() {
  await connectMongoose();
  const papers = await Paper.find().sort({ createdAt: -1 }).lean();
  const counts = await Question.aggregate<{ _id: unknown; n: number }>([
    { $match: { paperId: { $in: papers.map((p) => p._id) } } },
    { $group: { _id: '$paperId', n: { $sum: 1 } } },
  ]);
  const countByPaper = new Map(counts.map((c) => [String(c._id), c.n]));

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-inkMuted">Admin</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">Board papers</h1>
        </div>
        <Link href="/admin/papers/new">
          <Button>Upload paper</Button>
        </Link>
      </div>

      {papers.length === 0 ? (
        <Card className="mt-10">
          <p className="text-sm text-inkMuted">
            No papers yet. Upload a previous-year or sample paper PDF to import its questions.
          </p>
        </Card>
      ) : (
        <ul className="mt-10 space-y-3">
          {papers.map((p) => {
            const id = p._id.toString();
            return (
              <li key={id}>
                <Link href={`/admin/papers/${id}`} className="block">
                  <Card className="cursor-pointer">
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <h2 className="text-base font-semibold text-ink">{p.title}</h2>
                        <p className="mt-1 text-sm text-inkMuted">
                          {countByPaper.get(id) ?? 0} questions
                        </p>
                      </div>
                      <span
                        className={
                          p.status === 'published'
                            ? 'rounded-full bg-accentMuted px-3 py-1 text-xs font-medium text-accent'
                            : 'rounded-full border border-line px-3 py-1 text-xs font-medium text-inkMuted'
                        }
                      >
                        {p.status === 'published' ? 'Published' : 'Needs review'}
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
