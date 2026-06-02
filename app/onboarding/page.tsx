'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

const BOARDS = ['CBSE', 'ICSE', 'State', 'Other'] as const;
const GOALS = [
  { id: 'boards_90', label: 'Score 90%+ in boards' },
  { id: 'jee', label: 'Crack JEE' },
  { id: 'neet', label: 'Crack NEET' },
  { id: 'general', label: 'Learn properly' },
  { id: 'weak_subject', label: 'Fix a weak subject' },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [classNum, setClassNum] = useState<number | null>(null);
  const [board, setBoard] = useState<string | null>(null);
  const [goalType, setGoalType] = useState<string>('general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !classNum || !board) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/student-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: firstName.trim(), class: classNum, board, goalType }),
      });
      if (!res.ok) throw new Error('Failed to save');
      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-md">
        <p className="text-sm font-medium text-accent">Welcome to Examina</p>
        <h1 className="mt-2 font-display text-3xl tracking-tight text-ink">
          Let&apos;s set you up
        </h1>
        <p className="mt-2 text-sm text-inkMuted">
          Aryan Sir needs to know a bit about you to teach you right.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Your first name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Rohan"
              maxLength={50}
              required
              className="block w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accentMuted"
            />
          </div>

          {/* Class */}
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Which class are you in?</label>
            <div className="grid grid-cols-7 gap-2">
              {[6, 7, 8, 9, 10, 11, 12].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClassNum(c)}
                  className={`rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
                    classNum === c
                      ? 'border-accent bg-accent text-white'
                      : 'border-line bg-surface text-ink hover:border-accent hover:bg-accentMuted'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Board */}
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Your board</label>
            <div className="grid grid-cols-2 gap-2">
              {BOARDS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBoard(b)}
                  className={`rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
                    board === b
                      ? 'border-accent bg-accent text-white'
                      : 'border-line bg-surface text-ink hover:border-accent hover:bg-accentMuted'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">What&apos;s your main goal?</label>
            <div className="space-y-2">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoalType(g.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    goalType === g.id
                      ? 'border-accent bg-accentMuted text-accent'
                      : 'border-line bg-surface text-ink hover:border-accent hover:bg-accentMuted'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!firstName.trim() || !classNum || !board || submitting}
          >
            {submitting ? 'Setting up…' : "Let's go →"}
          </Button>
        </form>
      </div>
    </div>
  );
}
