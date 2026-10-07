import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicShell } from '@/components/public/PublicShell';
import { SUBJECT_LABEL, allSyllabusPages, getSyllabusPage } from '@/lib/curriculum';
import { JsonLd } from '@/lib/seo/JsonLd';
import { absoluteUrl } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return allSyllabusPages().map((p) => ({ slug: p.slug }));
}

function heading(classLevel: number, subject: string) {
  return `CBSE Class ${classLevel} ${subject} NCERT Chapters`;
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = getSyllabusPage(params.slug);
  if (!page) return {};
  const subject = SUBJECT_LABEL[page.subject];
  return {
    title: `${heading(page.classLevel, subject)} — Board Exam Prep`,
    description: `All ${page.chapters.length} NCERT chapters in CBSE Class ${page.classLevel} ${subject}, with an AI tutor, practice questions and board-style answer marking for each chapter.`,
    alternates: { canonical: `/syllabus/${page.slug}` },
  };
}

export default function SyllabusPage({ params }: { params: { slug: string } }) {
  const page = getSyllabusPage(params.slug);
  if (!page) notFound();
  const subject = SUBJECT_LABEL[page.subject];
  const others = allSyllabusPages().filter((p) => p.slug !== page.slug);

  return (
    <PublicShell>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: heading(page.classLevel, subject),
            numberOfItems: page.chapters.length,
            itemListElement: page.chapters.map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: c,
            })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
              {
                '@type': 'ListItem',
                position: 2,
                name: `Class ${page.classLevel} ${subject}`,
                item: absoluteUrl(`/syllabus/${page.slug}`),
              },
            ],
          },
        ]}
      />
      <article className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl tracking-tight text-ink sm:text-5xl">
          {heading(page.classLevel, subject)}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-inkMuted">
          The NCERT {subject} textbook for Class {page.classLevel} has {page.chapters.length}{' '}
          chapters. Board papers are set around this syllabus, so this is the list to revise from.
          Examina teaches each chapter section by section, then gives you practice with feedback.
        </p>

        <ol className="mt-10 divide-y divide-line border-y border-line">
          {page.chapters.map((c, i) => (
            <li key={c} className="flex gap-4 py-3 text-base text-ink">
              <span className="w-8 shrink-0 tabular-nums text-inkMuted">{i + 1}.</span>
              <span>{c}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-inkMuted">
          Chapter lists follow the current NCERT textbooks. Confirm the latest syllabus on the
          official CBSE website. Lessons are added chapter by chapter as they are published.
        </p>

        <div className="mt-10">
          <Link
            href="/login"
            className="inline-flex h-12 items-center rounded-full bg-accent px-7 text-base font-medium text-white hover:bg-accentHover"
          >
            Start Class {page.classLevel} {subject}
          </Link>
        </div>

        <h2 className="mt-14 font-display text-2xl tracking-tight text-ink">Other subjects</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {others.map((o) => (
            <li key={o.slug}>
              <Link href={`/syllabus/${o.slug}`} className="text-accent hover:underline">
                Class {o.classLevel} {SUBJECT_LABEL[o.subject]} chapters
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </PublicShell>
  );
}
