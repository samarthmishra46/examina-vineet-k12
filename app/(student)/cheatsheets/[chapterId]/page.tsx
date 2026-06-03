'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { CheatCard } from '@/lib/teaching/generate-cheatsheet';

const CATEGORY_COLORS: Record<string, string> = {
  'Formula':        'border-blue-200 bg-blue-50',
  'Definition':     'border-violet-200 bg-violet-50',
  'Key Rule':       'border-amber-200 bg-amber-50',
  'Quick Fact':     'border-green-200 bg-green-50',
  'Common Mistake': 'border-red-200 bg-red-50',
};

const CATEGORY_BADGE: Record<string, string> = {
  'Formula':        'bg-blue-100 text-blue-700',
  'Definition':     'bg-violet-100 text-violet-700',
  'Key Rule':       'bg-amber-100 text-amber-700',
  'Quick Fact':     'bg-green-100 text-green-700',
  'Common Mistake': 'bg-red-100 text-red-700',
};

export default function CheatSheetPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const [cards, setCards] = useState<CheatCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/cheatsheets/${chapterId}`)
      .then((r) => r.json())
      .then((d: { cards: CheatCard[]; error?: string }) => {
        if (d.error) { setError(d.error); return; }
        setCards(d.cards);
      })
      .catch(() => setError('Failed to load cheat sheet.'))
      .finally(() => setLoading(false));
  }, [chapterId]);

  // Group by category
  const grouped = cards
    ? cards.reduce<Record<string, CheatCard[]>>((acc, card) => {
        (acc[card.category] ??= []).push(card);
        return acc;
      }, {})
    : {};

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between">
        <Link href="/cheatsheets" className="text-sm text-inkMuted hover:text-ink">← All sheets</Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full border border-line px-4 py-1.5 text-sm text-inkMuted hover:border-accent hover:text-accent"
        >
          Print / Save PDF
        </button>
      </div>

      {loading && (
        <div className="mt-16 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
          <p className="mt-4 text-sm text-inkMuted">
            Aryan Sir is generating your cheat sheet… (~20 seconds)
          </p>
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {cards && (
        <div className="mt-8">
          <h1 className="font-display text-3xl tracking-tight text-ink">📋 Cheat Sheet</h1>
          <p className="mt-1 text-sm text-inkMuted">{cards.length} cards · All key formulas and definitions</p>

          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mt-8">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-inkMuted">
                {category}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((card, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border p-4 ${CATEGORY_COLORS[category] ?? 'border-line bg-surface'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug text-ink">{card.title}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[category] ?? 'bg-accentMuted text-accent'}`}>
                        {category}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-mono leading-relaxed text-ink/90">{card.content}</p>
                    {card.note && (
                      <p className="mt-2 text-xs italic text-inkMuted">💡 {card.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
