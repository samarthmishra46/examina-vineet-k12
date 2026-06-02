import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const SUBJECTS = [
  { name: 'Mathematics', icon: '📐', desc: 'Algebra, calculus, geometry — from basics to board level' },
  { name: 'Physics', icon: '⚛️', desc: 'Mechanics, electricity, optics, and more' },
  { name: 'Chemistry', icon: '🧪', desc: 'Organic, inorganic, physical — all boards covered' },
  { name: 'Biology', icon: '🧬', desc: 'Cell biology, genetics, human physiology' },
  { name: 'History', icon: '📜', desc: 'Modern, medieval, ancient — with context and story' },
  { name: 'English', icon: '📖', desc: 'Grammar, comprehension, writing — score full marks' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Pick any chapter',
    body: 'CBSE, ICSE, or state board — Class 6 to 12. Choose a subject and chapter, and start when you\'re ready.',
  },
  {
    step: '02',
    title: 'Aryan Sir teaches live',
    body: 'Your AI tutor draws on a whiteboard and explains every concept out loud — just like a 1:1 class.',
  },
  {
    step: '03',
    title: 'Ask doubts. Get answers.',
    body: 'Pause any time and type your question. Aryan Sir answers it on the same board, in plain language.',
  },
  {
    step: '04',
    title: 'Practice. Level up.',
    body: 'Adaptive questions after every lesson. Wrong answers get diagnosed — Aryan Sir shows exactly what went wrong.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight text-ink">
            Examina
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-inkMuted sm:inline">Class 6–12 · CBSE / ICSE</span>
            <Link
              href="/login"
              className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accentMuted px-3 py-1 text-xs font-medium text-accent">
            Class 6–12 · CBSE, ICSE &amp; State Boards
          </div>
          <h1 className="mt-6 font-display text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Learn like you have{' '}
            <span className="text-accent">India&apos;s best teacher</span>{' '}
            sitting next to you.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-inkMuted">
            Meet Aryan Sir — your AI tutor who draws on a live whiteboard, explains in plain language
            (Hinglish included), answers every doubt, and actually makes studying feel good.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/login">
              <Button size="lg">Start learning free →</Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="ghost" size="lg">
                How it works
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-inkMuted">
            Sign in with Google · No credit card needed
          </p>
        </section>

        {/* Subjects */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <p className="text-sm font-medium tracking-wide text-inkMuted">Subjects covered</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SUBJECTS.map((s) => (
                <div key={s.name} className="flex items-start gap-3 rounded-xl border border-line bg-canvas p-4">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{s.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-inkMuted">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-line">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <p className="text-sm font-medium tracking-wide text-inkMuted">How it works</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-ink">
              Not another video app
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((step) => (
                <div key={step.step} className="rounded-xl border border-line bg-surface p-5">
                  <span className="text-xs font-semibold tabular-nums text-accent">{step.step}</span>
                  <h3 className="mt-2 text-base font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-inkMuted">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social proof / CTA */}
        <section className="border-t border-line bg-accentMuted/30">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center">
            <p className="font-display text-4xl text-ink">
              Your board exams won&apos;t wait.
            </p>
            <p className="mt-4 text-lg text-inkMuted">
              Start with any chapter. No setup, no subscription. Just sign in and learn.
            </p>
            <div className="mt-8">
              <Link href="/login">
                <Button size="lg">Start with Aryan Sir →</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-inkMuted">
          © 2026 Examina · Class 6–12 AI Tutor
        </div>
      </footer>
    </div>
  );
}
