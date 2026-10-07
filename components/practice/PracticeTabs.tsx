'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PracticePlayer } from './PracticePlayer';
import { WrittenPractice } from './WrittenPractice';

type Mode = 'objective' | 'written';

export function PracticeTabs(props: {
  sectionId: string;
  sectionTitle: string;
  chapterId: string;
  chapterTitle: string;
}) {
  const [mode, setMode] = useState<Mode>('objective');

  return (
    <div>
      <div className="mx-auto max-w-3xl px-6 pt-6">
        <div className="inline-flex rounded-full border border-line bg-surface p-1">
          {(
            [
              ['objective', 'MCQ practice'],
              ['written', 'Written (board style)'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-std ease-std',
                mode === value ? 'bg-accent text-white' : 'text-inkMuted hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {mode === 'objective' ? (
        <PracticePlayer {...props} />
      ) : (
        <div className="mx-auto max-w-3xl px-6 py-8">
          <h1 className="mb-6 font-display text-2xl tracking-tight text-ink">
            {props.sectionTitle}
          </h1>
          <WrittenPractice sectionId={props.sectionId} />
        </div>
      )}
    </div>
  );
}
