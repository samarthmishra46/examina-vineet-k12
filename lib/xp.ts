export const LEVEL_THRESHOLDS = [0, 500, 1500, 3500, 7000, 13000, 22000, 35000, 55000, 80000];

export const LEVEL_RANKS = [
  'Fresher',
  'Curious',
  'Grinder',
  'Sharp',
  'Focused',
  'Unstoppable',
  'Legend',
  'Topper',
  'JEE-Mode',
  "Aryan's Fav",
];

export const XP_ACTIONS = {
  lesson_complete: 100,
  practice_perfect: 150,
  practice_great: 100,
  practice_ok: 60,
  flash_mode_daily: 30,
  streak_7_days: 200,
  wrong_answer_recovery: 15,
} as const;

export type XPAction = keyof typeof XP_ACTIONS;

export function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= (LEVEL_THRESHOLDS[i] ?? 0)) return i + 1;
  }
  return 1;
}

export function getRankFromLevel(level: number): string {
  return LEVEL_RANKS[Math.min(level - 1, LEVEL_RANKS.length - 1)] ?? 'Fresher';
}

export function getXPForLevel(level: number): number {
  return LEVEL_THRESHOLDS[Math.min(level - 1, LEVEL_THRESHOLDS.length - 1)] ?? 0;
}

export function getXPForNextLevel(level: number): number {
  return LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length - 1)] ?? 80000;
}

export function getLevelProgress(xp: number): { level: number; rank: string; current: number; needed: number; pct: number } {
  const level = getLevelFromXP(xp);
  const currentFloor = getXPForLevel(level);
  const nextFloor = getXPForNextLevel(level);
  const current = xp - currentFloor;
  const needed = nextFloor - currentFloor;
  const pct = needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 100;
  return { level, rank: getRankFromLevel(level), current, needed, pct };
}

// Juice items and what level they unlock at
export const JUICE_ITEMS = [
  { id: 'flash_mode', label: 'Flash Mode', desc: 'Spaced-repetition flashcards for every lesson.', unlockLevel: 2, icon: '⚡', href: '/flashcards' },
  { id: 'cheat_sheets', label: "Aryan Sir's Cheat Sheets", desc: 'One-page formula sheets. Download & print.', unlockLevel: 3, icon: '📋', href: '/cheatsheets' },
  { id: 'deep_dives', label: '"Why This Works" Deep Dives', desc: 'The story behind every formula.', unlockLevel: 4, icon: '🔬', href: '/deepdive' },
  { id: 'pyq_bank', label: 'Past Year Questions', desc: 'Board-exam pattern questions by chapter.', unlockLevel: 5, icon: '📚', href: '/pyq' },
  { id: 'speed_drills', label: 'Speed Drills', desc: '60 seconds per question. Pure speed.', unlockLevel: 6, icon: '🏃', href: '/drills' },
  { id: 'mock_exam', label: 'Mock Exam Mode', desc: 'Timed 30-question exam across all chapters.', unlockLevel: 9, icon: '🏆', href: '/mock-exam' },
] as const;
