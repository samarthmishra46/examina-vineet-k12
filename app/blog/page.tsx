import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';
import { Card } from '@/components/ui/Card';
import { POSTS } from '@/lib/content/blog';

export const metadata: Metadata = {
  title: 'CBSE Board Exam Revision Blog — Study Tips & Strategies',
  description:
    'Practical guides on how to revise for CBSE Class 10 and 12 board exams: Maths, Science, Physics, previous-year papers, active recall and revision plans.',
  alternates: { canonical: '/blog' },
};

export default function BlogIndexPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl tracking-tight text-ink sm:text-5xl">
          How to revise for your board exams
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-inkMuted">
          Practical, no-hype guides for CBSE Class 10 and Class 12 students.
        </p>
        <ul className="mt-10 space-y-4">
          {POSTS.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="block">
                <Card className="cursor-pointer">
                  <p className="text-xs text-inkMuted">
                    <time dateTime={p.published}>{p.published}</time> · {p.tags.join(' · ')}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">{p.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-inkMuted">{p.description}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PublicShell>
  );
}
