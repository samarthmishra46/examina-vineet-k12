import type { Metadata } from 'next';
import { isValidObjectId } from 'mongoose';
import { redirect } from 'next/navigation';
import { LessonPlayer } from '@/components/tutor/LessonPlayer';
import { requireAuth } from '@/lib/auth/helpers';
import { Chapter, Section, connectMongoose } from '@/lib/db/models';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { sectionId: string };
}): Promise<Metadata> {
  if (!isValidObjectId(params.sectionId)) return { title: 'Lesson · Examina' };
  await connectMongoose();
  const section = await Section.findById(params.sectionId).select('title').lean();
  return { title: section ? `${section.title} · Examina` : 'Lesson · Examina' };
}

export default async function LearnPage({ params }: { params: { sectionId: string } }) {
  if (!isValidObjectId(params.sectionId)) redirect('/dashboard');

  await requireAuth();
  await connectMongoose();

  const section = await Section.findById(params.sectionId).lean();
  if (!section) redirect('/dashboard');

  const chapter = await Chapter.findById(section.chapterId).lean();
  if (!chapter || chapter.status !== 'published') redirect('/dashboard');

  return (
    <LessonPlayer
      sectionId={section._id.toString()}
      chapterId={chapter._id.toString()}
      chapterTitle={chapter.title}
      sectionTitle={section.title}
      sectionOrder={section.order}
      learningObjectives={section.learningObjectives ?? []}
      estimatedMinutes={section.estimatedMinutes ?? 10}
    />
  );
}
