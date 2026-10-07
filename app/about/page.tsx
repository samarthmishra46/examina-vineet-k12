import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';
import { JsonLd } from '@/lib/seo/JsonLd';
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About Examina — AI Tutor for CBSE Boards',
  description:
    'Why Examina exists: a patient AI tutor for CBSE Class 10 and 12 students that teaches NCERT chapters, marks your answers and shows you what to revise.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <PublicShell>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: `About ${SITE_NAME}`,
          url: absoluteUrl('/about'),
          description: SITE_DESCRIPTION,
          mainEntity: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
        }}
      />
      <article className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl tracking-tight text-ink sm:text-5xl">About Examina</h1>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-inkMuted">
          <p>
            Most students do not struggle with board exams because they are not working hard. They
            struggle because nobody is there at 10 pm to explain a step again, to say why an answer
            lost marks, or to point out which chapter to revise next.
          </p>
          <p>
            Examina is an AI tutor built for that gap. It teaches chapters from the NCERT
            textbook on a live whiteboard, explains out loud, and lets you ask doubts after each
            lesson. Then it asks you questions, marks your answers the way a board
            examiner would, and tells you what kind of mistake you made.
          </p>
        </div>

        <h2 className="mt-12 font-display text-2xl tracking-tight text-ink">What we focus on</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed text-inkMuted">
          <li>NCERT first: lessons and questions follow the textbook your exam is based on.</li>
          <li>Board answer format: step-wise working, because step marks matter.</li>
          <li>Feedback on every answer, including why you lost marks and how to fix it.</li>
          <li>Honest limits: AI can be wrong, so we encourage you to check against NCERT.</li>
        </ul>

        <h2 className="mt-12 font-display text-2xl tracking-tight text-ink">Good to know</h2>
        <p className="mt-4 text-base leading-relaxed text-inkMuted">
          Examina is an independent study tool. It is not affiliated with or endorsed by CBSE or
          NCERT. Always check the official CBSE website for the current syllabus, exam pattern and
          dates.
        </p>

        <div className="mt-12 flex flex-wrap gap-4 text-sm">
          <Link href="/login" className="text-accent hover:underline">
            Start learning →
          </Link>
          <Link href="/faq" className="text-accent hover:underline">
            Read the FAQ →
          </Link>
          <Link href="/blog" className="text-accent hover:underline">
            Revision articles →
          </Link>
        </div>
      </article>
    </PublicShell>
  );
}
