import type { Metadata } from 'next';
import { requireAuth } from '@/lib/auth/helpers';
import { FlashDeck } from '@/components/gamification/FlashDeck';

export const metadata: Metadata = { title: 'Flash Mode · Examina' };

export default async function FlashcardsPage() {
  await requireAuth();
  return (
    <div className="mx-auto max-w-lg px-6 py-8">
      <div className="mb-2">
        <p className="text-sm font-medium uppercase tracking-wide text-inkMuted">Flash Mode</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-ink">Due today</h1>
        <p className="mt-1 text-sm text-inkMuted">
          Aryan Sir says: 10 minutes of flashcards beats 2 hours of passive reading.
        </p>
      </div>
      <FlashDeck />
    </div>
  );
}
