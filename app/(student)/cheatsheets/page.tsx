import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { requireAuth } from '@/lib/auth/helpers';
import { Chapter, connectMongoose } from '@/lib/db/models';

export const metadata: Metadata = { title: "Aryan Sir's Cheat Sheets · Examina" };

export default async function CheatSheetsListPage() {
  await requireAuth();
  await connectMongoose();

  const chapters = await Chapter.find({ status: 'published' }).sort({ updatedAt: -1 }).lean();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-inkMuted hover:text-ink">← Dashboard</Link>
      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">📋 Cheat Sheets</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-ink">
          Aryan Sir&apos;s Formula Sheets
        </h1>
        <p className="mt-2 text-sm text-inkMuted">
          One-page summaries with every formula, definition, and key rule. Pick a chapter.
        </p>
      </div>

      {chapters.length === 0 ? (
        <Card className="mt-8">
          <p className="text-sm text-inkMuted">No chapters available yet.</p>
        </Card>
      ) : (
        <ul className="mt-8 space-y-3">
          {chapters.map((ch) => (
            <li key={ch._id.toString()}>
              <Link href={`/cheatsheets/${ch._id}`} className="block">
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{ch.title}</p>
                      {ch.description && (
                        <p className="mt-1 text-sm text-inkMuted line-clamp-1">{ch.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm text-accent">View →</span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
