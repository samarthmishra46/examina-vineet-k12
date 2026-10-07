import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicShell } from '@/components/public/PublicShell';
import { POSTS, getPost } from '@/lib/content/blog';
import { JsonLd } from '@/lib/seo/JsonLd';
import { absoluteUrl, SITE_NAME } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      publishedTime: post.published,
      url: absoluteUrl(`/blog/${post.slug}`),
    },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();
  const url = absoluteUrl(`/blog/${post.slug}`);

  return (
    <PublicShell>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.description,
            datePublished: post.published,
            dateModified: post.published,
            mainEntityOfPage: url,
            author: { '@type': 'Organization', name: SITE_NAME },
            publisher: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
            keywords: post.tags.join(', '),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
              { '@type': 'ListItem', position: 2, name: 'Blog', item: absoluteUrl('/blog') },
              { '@type': 'ListItem', position: 3, name: post.title, item: url },
            ],
          },
        ]}
      />
      <article className="mx-auto max-w-2xl px-6 py-16">
        <nav aria-label="Breadcrumb" className="text-sm text-inkMuted">
          <Link href="/blog" className="hover:text-ink">
            ← All articles
          </Link>
        </nav>
        <h1 className="mt-6 font-display text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-3 text-sm text-inkMuted">
          <time dateTime={post.published}>{post.published}</time> · {post.tags.join(' · ')}
        </p>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-ink/90">
          {post.body.map((b, i) => {
            if (b.t === 'h2')
              return (
                <h2 key={i} className="pt-4 font-display text-2xl tracking-tight text-ink">
                  {b.text}
                </h2>
              );
            if (b.t === 'p') return <p key={i}>{b.text}</p>;
            if (b.t === 'ul')
              return (
                <ul key={i} className="list-disc space-y-1.5 pl-5">
                  {b.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              );
            return (
              <ol key={i} className="list-decimal space-y-1.5 pl-5">
                {b.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ol>
            );
          })}
        </div>
        <aside className="mt-12 rounded-md border border-line bg-surface p-6">
          <p className="font-medium text-ink">Practise this with an AI tutor</p>
          <p className="mt-1 text-sm text-inkMuted">
            Examina teaches NCERT chapters, marks your answers against board marking schemes and
            shows you what to revise.
          </p>
          <Link href="/login" className="mt-3 inline-block text-sm text-accent hover:underline">
            Start learning →
          </Link>
        </aside>
      </article>
    </PublicShell>
  );
}
