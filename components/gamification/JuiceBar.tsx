'use client';

import Link from 'next/link';
import { JUICE_ITEMS } from '@/lib/xp';

export function JuiceBar({ level }: { level: number }) {
  void level; // kept for future gating; everything unlocked for now

  return (
    <div className="mt-14">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-inkMuted">Rewards</h2>
        <span className="text-xs text-inkMuted">All unlocked</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {JUICE_ITEMS.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-accent/20 bg-accentMuted/40 p-4 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{item.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-inkMuted">{item.desc}</p>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="mt-2 inline-block rounded-full bg-accent/10 px-3 py-0.5 text-xs font-medium text-accent hover:bg-accent/20"
                  >
                    Open →
                  </Link>
                ) : (
                  <span className="mt-2 inline-block rounded-full bg-accent/10 px-3 py-0.5 text-xs font-medium text-accent">
                    Available
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
