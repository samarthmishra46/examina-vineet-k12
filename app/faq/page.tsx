import type { Metadata } from 'next';
import { PublicShell } from '@/components/public/PublicShell';
import { FAQS } from '@/lib/content/faqs';
import { JsonLd } from '@/lib/seo/JsonLd';

export const metadata: Metadata = {
  title: 'FAQ — Examina AI Tutor for CBSE Board Exams',
  description:
    'Answers to common questions about Examina: classes and subjects covered, NCERT alignment, how the AI tutor works, answer marking and practice.',
  alternates: { canonical: '/faq' },
};

export default function FaqPage() {
  return (
    <PublicShell>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
      <article className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl tracking-tight text-ink sm:text-5xl">
          Frequently asked questions
        </h1>
        <dl className="mt-10 space-y-8">
          {FAQS.map((f) => (
            <div key={f.q}>
              <dt className="text-lg font-semibold text-ink">{f.q}</dt>
              <dd className="mt-2 text-base leading-relaxed text-inkMuted">{f.a}</dd>
            </div>
          ))}
        </dl>
      </article>
    </PublicShell>
  );
}
