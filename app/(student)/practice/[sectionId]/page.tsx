import type { Metadata } from 'next';
import { isValidObjectId } from 'mongoose';
import { notFound } from 'next/navigation';
import { PracticePlayer } from '@/components/practice/PracticePlayer';
import { requireAuth } from '@/lib/auth/helpers';
import { Chapter, Section, connectMongoose } from '@/lib/db/models';

export async function generateMetadata({
  params,
}: {
  params: { sectionId: string };
}): Promise<Metadata> {
  if (!isValidObjectId(params.sectionId)) return { title: 'Practice · Examina' };
  await connectMongoose();
  const section = await Section.findById(params.sectionId).select('title').lean();
  return { title: section ? `Practice: ${section.title} · Examina` : 'Practice · Examina' };
}

export default async function PracticePage({ params }: { params: { sectionId: string } }) {
  if (!isValidObjectId(params.sectionId)) notFound();

  await requireAuth();
  await connectMongoose();

  const section = await Section.findById(params.sectionId).lean();
  if (!section) notFound();

  const chapter = await Chapter.findById(section.chapterId).lean();
  if (!chapter || chapter.status !== 'published') notFound();

  return (
    <PracticePlayer
      sectionId={params.sectionId}
      sectionTitle={section.title}
      chapterId={section.chapterId.toString()}
      chapterTitle={chapter.title}
    />
  );
}
