'use client';

import { useEffect, useState } from 'react';

interface DueCard {
  progressId: string;
  flashcardId: string;
  front: string;
  back: string;
  hint: string;
  type: string;
  intervalDays: number;
  totalReviews: number;
}

type Rating = 'easy' | 'almost' | 'confused';

export function FlashDeck() {
  const [cards, setCards] = useState<DueCard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [sessionStats, setSessionStats] = useState({ easy: 0, almost: 0, confused: 0 });

  useEffect(() => {
    fetch('/api/flashcards/due')
      .then((r) => r.json())
      .then((d: { cards: DueCard[] }) => {
        setCards(d.cards);
        setLoading(false);
        if (d.cards.length === 0) setDone(true);
      })
      .catch(() => setLoading(false));
  }, []);

  const current = cards[index];

  async function handleRating(rating: Rating) {
    if (!current) return;

    setSessionStats((s) => ({ ...s, [rating]: s[rating] + 1 }));

    await fetch('/api/flashcards/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progressId: current.progressId, rating }),
    });

    // Award XP for flash mode
    if (index === 0) {
      void fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flash_mode_daily' }),
      });
    }

    if (index + 1 >= cards.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
      setShowHint(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-inkMuted">
        Loading your cards…
      </div>
    );
  }

  if (done || cards.length === 0) {
    const total = sessionStats.easy + sessionStats.almost + sessionStats.confused;
    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <p className="font-display text-3xl text-ink">
          {cards.length === 0 ? 'All caught up!' : 'Session done!'}
        </p>
        <p className="mt-3 text-sm text-inkMuted">
          {cards.length === 0
            ? 'No cards due today. Come back tomorrow.'
            : `${total} cards reviewed. ${sessionStats.easy} nailed, ${sessionStats.confused} need more work.`}
        </p>
        {total > 0 && (
          <p className="mt-2 text-xs text-accent">+30 XP awarded for today&apos;s flash session</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Progress */}
      <div className="mb-6 flex items-center justify-between text-xs text-inkMuted">
        <span>Card {index + 1} of {cards.length}</span>
        <span className="capitalize rounded-full border border-line px-2 py-0.5">{current?.type}</span>
      </div>

      {/* Card */}
      <div
        className="min-h-[220px] cursor-pointer rounded-2xl border border-line bg-surface p-8 shadow-sm transition-all duration-200 hover:shadow-md"
        onClick={() => { setFlipped(true); setShowHint(false); }}
      >
        {!flipped ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-lg font-semibold leading-snug text-ink">{current?.front}</p>
            {!showHint && current?.hint && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowHint(true); }}
                className="mt-6 text-xs text-inkMuted hover:text-accent"
              >
                Show hint
              </button>
            )}
            {showHint && (
              <p className="mt-4 text-sm italic text-inkMuted">💡 {current?.hint}</p>
            )}
            <p className="mt-6 text-xs text-inkMuted">Tap to reveal</p>
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center">
            <p className="text-xs font-medium uppercase tracking-wide text-inkMuted mb-3">Answer</p>
            <p className="text-lg font-semibold leading-relaxed text-ink">{current?.back}</p>
          </div>
        )}
      </div>

      {/* Rating buttons — only shown after flip */}
      {flipped && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleRating('confused')}
            className="rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            Still confused
          </button>
          <button
            type="button"
            onClick={() => handleRating('almost')}
            className="rounded-xl border border-amber-200 bg-amber-50 py-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
          >
            Almost
          </button>
          <button
            type="button"
            onClick={() => handleRating('easy')}
            className="rounded-xl border border-green-200 bg-green-50 py-3 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
          >
            Nailed it ✓
          </button>
        </div>
      )}
    </div>
  );
}
