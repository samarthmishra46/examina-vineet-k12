import type { Metadata } from 'next';
import { isValidObjectId } from 'mongoose';
import { notFound } from 'next/navigation';
import { Chapter, Question, Section, connectMongoose } from '@/lib/db/models';
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
  const sectionIds = sections.map((s) => s._id);
  const counts = await Question.aggregate([
    { $match: { sectionId: { $in: sectionIds }, flagSuspended: { $ne: true } } },
    { $group: { _id: '$sectionId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((r: { _id: unknown; count: number }) => [r._id!.toString(), r.count as number]));

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
    questionCount: countMap.get(s._id.toString()) ?? 0,
  }));

  return <RoadmapEditor chapter={chapterView} initialSections={sectionsView} />;
}
