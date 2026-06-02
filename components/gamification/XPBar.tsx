'use client';

import { useEffect, useState } from 'react';
import { getLevelProgress } from '@/lib/xp';

interface XPData {
  xp: number;
  level: number;
  rank: string;
  current: number;
  needed: number;
  pct: number;
  streakDays: number;
}

export function XPBar() {
  const [data, setData] = useState<XPData | null>(null);

  useEffect(() => {
    fetch('/api/game-profile')
      .then((r) => r.json())
      .then((d: XPData) => setData(d))
      .catch(() => null);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-4 w-20 animate-pulse rounded bg-accentMuted" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Streak */}
      {data.streakDays > 0 && (
        <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          🔥 {data.streakDays}
        </span>
      )}

      {/* Level + XP bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-accent">Lv.{data.level}</span>
        <div className="hidden w-20 sm:block">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-accentMuted">
            <div
              className="h-full rounded-full bg-accent transition-all duration-700 ease-out"
              style={{ width: `${data.pct}%` }}
            />
          </div>
        </div>
        <span className="hidden text-xs text-inkMuted sm:inline">{data.rank}</span>
      </div>
    </div>
  );
}
