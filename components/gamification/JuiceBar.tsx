'use client';

import Link from 'next/link';
import { JUICE_ITEMS } from '@/lib/xp';

export function JuiceBar({ level }: { level: number }) {
  const unlocked = JUICE_ITEMS.filter((i) => level >= i.unlockLevel);
  const locked = JUICE_ITEMS.filter((i) => level < i.unlockLevel);

  return (
    <div className="mt-14">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-ink">Rewards</h2>
        {locked.length > 0 && (
          <span className="text-xs text-inkMuted">{locked.length} more unlock as you level up</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Unlocked items first */}
        {unlocked.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-accent/20 bg-accentMuted/40 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{item.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-inkMuted">{item.desc}</p>
                {item.href && (
                  <Link
                    href={item.href}
                    className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
                  >
                    Open →
                  </Link>
                )}
                {!item.href && (
                  <span className="mt-2 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    Unlocked ✓
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Locked items */}
        {locked.map((item) => (
          <div
            key={item.id}
            className="relative overflow-hidden rounded-xl border border-line bg-surface p-4 opacity-60"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl grayscale">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-inkMuted">{item.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-inkMuted/70">{item.desc}</p>
                <span className="mt-2 inline-block rounded-full border border-line px-2 py-0.5 text-xs text-inkMuted">
                  Level {item.unlockLevel}
                </span>
              </div>
            </div>
            {/* lock icon overlay */}
            <div className="absolute right-3 top-3 text-inkMuted/40">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <rect x="2" y="6" width="10" height="7" rx="1.5" fill="currentColor" />
                <path
                  d="M4.5 6V4.5a2.5 2.5 0 015 0V6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
