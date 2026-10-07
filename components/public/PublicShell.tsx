import Link from 'next/link';
import { NAV_LINKS, SITE_NAME } from '@/lib/site';
import { allSyllabusPages } from '@/lib/curriculum';
import { SUBJECT_LABEL } from '@/lib/curriculum';

export function PublicShell({ children }: { children: React.ReactNode }) {
  const syllabus = allSyllabusPages();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-sm font-medium tracking-tight">
            {SITE_NAME}
          </Link>
          <nav aria-label="Main" className="flex items-center gap-5">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hidden text-sm text-inkMuted transition-colors duration-std ease-std hover:text-ink sm:inline"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors duration-std ease-std hover:bg-accentHover"
            >
              Start learning
            </Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-24 border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 text-sm sm:grid-cols-3">
          <div>
            <p className="font-medium text-ink">{SITE_NAME}</p>
            <p className="mt-2 max-w-xs leading-relaxed text-inkMuted">
              An AI tutor for school board exam preparation, built around NCERT.
            </p>
          </div>
          <nav aria-label="Syllabus">
            <p className="font-medium text-ink">NCERT syllabus</p>
            <ul className="mt-2 space-y-1.5 text-inkMuted">
              {syllabus.map((p) => (
                <li key={p.slug}>
                  <Link href={`/syllabus/${p.slug}`} className="hover:text-ink">
                    Class {p.classLevel} {SUBJECT_LABEL[p.subject]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Company">
            <p className="font-medium text-ink">Learn more</p>
            <ul className="mt-2 space-y-1.5 text-inkMuted">
              <li>
                <Link href="/blog" className="hover:text-ink">
                  Revision blog
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-ink">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-ink">
                  About
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-6xl px-6 py-6 text-xs leading-relaxed text-inkMuted">
            © 2026 {SITE_NAME}. Independent study tool, not affiliated with CBSE or NCERT. Check
            the official CBSE website for the current syllabus and exam dates.
          </p>
        </div>
      </footer>
    </div>
  );
}
