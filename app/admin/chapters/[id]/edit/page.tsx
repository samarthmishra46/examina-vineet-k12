import type { Metadata } from 'next';
import { isValidObjectId } from 'mongoose';
import { notFound } from 'next/navigation';
import { Chapter, Section, connectMongoose } from '@/lib/db/models';
import { RoadmapEditor, type ChapterView, type SectionView } from './RoadmapEditor';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  if (!isValidObjectId(params.id)) return { title: 'Edit chapter · Admin · Examina' };
  await connectMongoose();
  const chapter = await Chapter.findById(params.id).select('title').lean();
  return {
    title: chapter
      ? `${chapter.title} · Admin · Examina`
      : 'Edit chapter · Admin · Examina',
  };
}

export default async function EditChapterPage({ params }: { params: { id: string } }) {
  if (!isValidObjectId(params.id)) notFound();

  await connectMongoose();
  const chapter = await Chapter.findById(params.id).lean();
  if (!chapter) notFound();

  const sections = await Section.find({ chapterId: chapter._id }).sort({ order: 1 }).lean();

  const chapterView: ChapterView = {
    _id: chapter._id.toString(),
    title: chapter.title,
    description: chapter.description ?? '',
    status: chapter.status === 'published' ? 'published' : 'draft',
    sourceType: chapter.sourceType === 'pdf' ? 'pdf' : 'text',
    sourceUrl: chapter.sourceUrl ?? null,
  };

  const sectionsView: SectionView[] = sections.map((s) => ({
    _id: s._id.toString(),
    order: s.order,
    title: s.title,
    description: s.description ?? '',
    learningObjectives: s.learningObjectives ?? [],
    estimatedMinutes: s.estimatedMinutes ?? 5,
  }));

  return <RoadmapEditor chapter={chapterView} initialSections={sectionsView} />;
}
