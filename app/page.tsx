import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const steps = [
  {
    title: 'Pick a chapter',
    body: "Browse the syllabus, choose a section, and start when you're ready. No friction, no fluff.",
  },
  {
    title: 'Watch it unfold',
    body: 'A live whiteboard fills in step by step while your tutor walks you through every move out loud.',
  },
  {
    title: 'Ask doubts as they come up',
    body: 'After each idea your tutor pauses. Ask anything — answers come in plain language, on the same board.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-sm font-medium tracking-tight">
            Examina
          </Link>
          <Link
            href="/login"
            className="text-sm text-inkMuted transition-colors duration-std ease-std hover:text-ink"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Learn CAT concepts the way a great tutor would explain them.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-inkMuted">
            An AI tutor that writes on a live whiteboard and walks you through every step out loud.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/login">
              <Button size="lg">Start learning</Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="ghost" size="lg">
                How it works →
              </Button>
            </Link>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-line">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <p className="text-sm font-medium tracking-wide text-inkMuted">How it works</p>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {steps.map((step) => (
                <Card key={step.title}>
                  <h3 className="text-base font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-inkMuted">{step.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-inkMuted">© 2026 Examina</div>
      </footer>
    </div>
  );
}
