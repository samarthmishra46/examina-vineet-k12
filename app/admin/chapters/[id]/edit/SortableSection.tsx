'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { deleteSection, updateSection } from '@/lib/actions/chapters';
import { cn } from '@/lib/utils';
import type { SectionView } from './RoadmapEditor';

type GenStatus = 'idle' | 'generating' | 'done' | 'error';

export function SortableSection({
  section,
  onChange,
  onDelete,
  onError,
}: {
  section: SectionView;
  onChange: (s: SectionView) => void;
  onDelete: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description);
  const [objectives, setObjectives] = useState(section.learningObjectives);
  const [minutes, setMinutes] = useState(section.estimatedMinutes);
  const [pending, startTransition] = useTransition();
  const [genStatus, setGenStatus] = useState<GenStatus>('idle');
  const [genCount, setGenCount] = useState<number | null>(null);

  const dirty =
    title !== section.title ||
    description !== section.description ||
    minutes !== section.estimatedMinutes ||
    objectives.length !== section.learningObjectives.length ||
    objectives.some((o, i) => o !== section.learningObjectives[i]);

  function handleSave() {
    startTransition(async () => {
      try {
        const trimmed = objectives.map((o) => o.trim()).filter((o) => o.length > 0);
        await updateSection(section._id, {
          title: title.trim(),
          description: description.trim(),
          learningObjectives: trimmed,
          estimatedMinutes: minutes,
        });
        onChange({
          ...section,
          title: title.trim(),
          description: description.trim(),
          learningObjectives: trimmed,
          estimatedMinutes: minutes,
        });
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Failed to save section.');
      }
    });
  }

  async function handleGenerateQuestions() {
    setGenStatus('generating');
    try {
      const res = await fetch('/api/admin/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: section._id }),
      });
      const data = (await res.json()) as { count?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setGenCount(data.count ?? null);
      setGenStatus('done');
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to generate questions.');
      setGenStatus('error');
    }
  }

  function handleDelete() {
    if (!confirm('Delete this section?')) return;
    startTransition(async () => {
      try {
        await deleteSection(section._id);
        onDelete(section._id);
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Failed to delete section.');
      }
    });
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border border-line bg-surface p-5 shadow-sm transition-shadow duration-std ease-std',
        isDragging && 'opacity-60 shadow-lg',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab touch-none rounded p-1 text-inkMuted hover:bg-accentMuted hover:text-accent active:cursor-grabbing"
        >
          <DragHandle />
        </button>
        <span className="mt-1 text-sm font-medium tabular-nums text-inkMuted">
          {String(section.order).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Section title"
            maxLength={120}
            className="block w-full bg-transparent text-base font-semibold text-ink outline-none placeholder:text-inkMuted/40"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What the student will learn in this section."
            rows={2}
            maxLength={500}
            className="block w-full resize-none bg-transparent text-sm leading-relaxed text-inkMuted outline-none placeholder:text-inkMuted/40"
          />

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-inkMuted">
              Learning objectives
            </p>
            <ul className="space-y-2">
              {objectives.map((obj, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-inkMuted">•</span>
                  <input
                    value={obj}
                    onChange={(e) => {
                      const copy = [...objectives];
                      copy[i] = e.target.value;
                      setObjectives(copy);
                    }}
                    placeholder="An action phrase, e.g. Solve quadratic equations using the formula"
                    className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-inkMuted/40"
                  />
                  <button
                    type="button"
                    onClick={() => setObjectives((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-xs text-inkMuted transition-colors duration-std ease-std hover:text-danger"
                    aria-label="Remove objective"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setObjectives((prev) => [...prev, ''])}
              className="mt-2 text-xs text-inkMuted transition-colors duration-std ease-std hover:text-accent"
            >
              + Add objective
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-inkMuted">
            <label htmlFor={`mins-${section._id}`}>Estimated minutes:</label>
            <input
              id={`mins-${section._id}`}
              type="number"
              min={1}
              max={60}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value) || 0)}
              className="w-16 rounded-md border border-line bg-surface px-2 py-1 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          {(dirty || pending) && (
            <div className="flex items-center gap-3 pt-1">
              <Button onClick={handleSave} disabled={pending}>
                {pending ? 'Saving…' : 'Save section'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setTitle(section.title);
                  setDescription(section.description);
                  setObjectives(section.learningObjectives);
                  setMinutes(section.estimatedMinutes);
                }}
                className="text-sm text-inkMuted transition-colors duration-std ease-std hover:text-ink"
              >
                Discard
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={handleGenerateQuestions}
            disabled={genStatus === 'generating' || pending}
            className="text-xs text-inkMuted transition-colors duration-std ease-std hover:text-accent disabled:opacity-50 whitespace-nowrap"
            title="Generate practice questions for this section using Claude"
          >
            {genStatus === 'generating'
              ? 'Generating…'
              : genStatus === 'done'
                ? `✓ ${genCount ?? ''} questions`
                : 'Gen questions'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="text-xs text-inkMuted transition-colors duration-std ease-std hover:text-danger disabled:opacity-50"
            aria-label="Delete section"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

function DragHandle() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="4" cy="3" r="1" fill="currentColor" />
      <circle cx="10" cy="3" r="1" fill="currentColor" />
      <circle cx="4" cy="7" r="1" fill="currentColor" />
      <circle cx="10" cy="7" r="1" fill="currentColor" />
      <circle cx="4" cy="11" r="1" fill="currentColor" />
      <circle cx="10" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}
