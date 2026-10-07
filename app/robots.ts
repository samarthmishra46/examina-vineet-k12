import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Public marketing, blog and syllabus pages are crawlable (including AI search crawlers);
// the signed-in app and admin are not.
const PRIVATE = [
  '/admin',
  '/api',
  '/dashboard',
  '/learn',
  '/practice',
  '/chapter',
  '/onboarding',
  '/post-login',
  '/subscribe',
  '/cheatsheets',
  '/deepdive',
  '/drills',
  '/flashcards',
  '/mock-exam',
  '/pyq',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      { userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended'], allow: '/', disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
