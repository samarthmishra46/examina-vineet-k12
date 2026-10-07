/**
 * Canonical site config. Set NEXT_PUBLIC_SITE_URL in Vercel to the real custom domain
 * (no trailing slash) — canonical URLs, the sitemap and structured data all derive from it.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://examina-ai-study.vercel.app'
).replace(/\/$/, '');

export const SITE_NAME = 'Examina';
export const SITE_TAGLINE = 'AI tutor for board exam preparation';
export const SITE_DESCRIPTION =
  'Examina is an AI tutor for school board exams, built around NCERT. Learn chapters on a live whiteboard, practise MCQs and written answers, and get marked against board marking schemes.';

export const NAV_LINKS = [
  { href: '/syllabus/cbse-class-10-maths', label: 'Class 10' },
  { href: '/syllabus/cbse-class-12-physics', label: 'Class 12' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
] as const;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
