'use client';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import {
  addSection,
  deleteChapter,
  publishChapter,
  reorderSections,
  unpublishChapter,
  updateChapterMeta,
} from '@/lib/actions/chapters';
import { SortableSection } from './SortableSection';

export type ChapterView = {
  _id: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  sourceType: 'pdf' | 'text';
  sourceUrl: string | null;
};

export type SectionView = {
  _id: string;
  order: number;
  title: string;
  description: string;
  learningObjectives: string[];
  estimatedMinutes: number;
};

export function RoadmapEditor({
  chapter,
  initialSections,
}: {
  chapter: ChapterView;
  initialSections: SectionView[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(chapter.title);
  const [description, setDescription] = useState(chapter.description);
  const [sections, setSections] = useState(initialSections);
  const [savingMeta, startMetaTransition] = useTransition();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const metaDirty = title !== chapter.title || description !== chapter.description;
  const isPublished = chapter.status === 'published';

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s._id === active.id);
    const newIndex = sections.findIndex((s) => s._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({
      ...s,
      order: i + 1,
    }));
    setSections(reordered);
    startTransition(async () => {
      try {
        await reorderSections(
          chapter._id,
          reordered.map((s) => s._id),
        );
      } catch (e) {
        setError(messageFrom(e));
      }
    });
  }

  function handleSaveMeta() {
    setError(null);
    startMetaTransition(async () => {
      try {
        await updateChapterMeta(chapter._id, { title, description });
        router.refresh();
      } catch (e) {
        setError(messageFrom(e));
      }
    });
  }

  function handleAddSection() {
    setError(null);
    startTransition(async () => {
      try {
        await addSection(chapter._id);
        router.refresh();
      } catch (e) {
        setError(messageFrom(e));
      }
    });
  }

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      try {
        if (isPublished) await unpublishChapter(chapter._id);
        else await publishChapter(chapter._id);
        router.refresh();
      } catch (e) {
        setError(messageFrom(e));
      }
    });
  }

  function handleDeleteChapter() {
    if (!confirm('Delete this chapter and all its sections? This cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteChapter(chapter._id);
      } catch (e) {
        const msg = messageFrom(e);
        if (/NEXT_REDIRECT/.test(msg)) return;
        setError(msg);
      }
    });
  }

  function handleSectionChanged(updated: SectionView) {
    setSections((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
  }

  function handleSectionDeleted(id: string) {
    setSections((prev) => prev.filter((s) => s._id !== id));
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/chapters"
          className="text-sm text-inkMuted transition-colors duration-std ease-std hover:text-ink"
        >
          ← All chapters
        </Link>
        <div className="flex items-center gap-3">
          <span
            className={
              isPublished
                ? 'rounded-full bg-accentMuted px-3 py-1 text-xs font-medium text-accent'
                : 'rounded-full border border-line px-3 py-1 text-xs font-medium text-inkMuted'
            }
          >
            {isPublished ? 'Published' : 'Draft'}
          </span>
          <Button variant="ghost" onClick={handlePublish} disabled={pending}>
            {isPublished ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Chapter meta */}
      <div className="mt-10 space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Chapter title"
          className="block w-full bg-transparent font-display text-4xl tracking-tight text-ink outline-none placeholder:text-inkMuted/40"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A short, student-friendly summary of what this chapter covers."
          rows={2}
          className="block w-full resize-none bg-transparent text-base leading-relaxed text-inkMuted outline-none placeholder:text-inkMuted/40"
        />
        {metaDirty && (
          <div className="flex items-center gap-3">
            <Button onClick={handleSaveMeta} disabled={savingMeta}>
              {savingMeta ? 'Saving…' : 'Save chapter details'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setTitle(chapter.title);
                setDescription(chapter.description);
              }}
              className="text-sm text-inkMuted transition-colors duration-std ease-std hover:text-ink"
            >
              Discard
            </button>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-wide text-inkMuted">Sections</h2>
          <span className="text-xs text-inkMuted">{sections.length} total</span>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sections.map((s) => s._id)} strategy={verticalListSortingStrategy}>
            <ul className="mt-4 space-y-3">
              {sections.map((section) => (
                <SortableSection
                  key={section._id}
                  section={section}
                  onChange={handleSectionChanged}
                  onDelete={handleSectionDeleted}
                  onError={setError}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <div className="mt-4">
          <Button variant="ghost" onClick={handleAddSection} disabled={pending}>
            + Add section
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-8 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-16 border-t border-line pt-8">
        <button
          type="button"
          onClick={handleDeleteChapter}
          disabled={pending}
          className="text-sm text-danger transition-colors duration-std ease-std hover:underline disabled:opacity-50"
        >
          Delete this chapter
        </button>
      </div>
    </div>
  );
}

function messageFrom(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}
