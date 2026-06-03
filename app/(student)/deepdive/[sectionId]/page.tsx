import type { Metadata } from 'next';
import { isValidObjectId } from 'mongoose';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/helpers';
import { Chapter, Section, connectMongoose } from '@/lib/db/models';
import { DeepDivePlayer } from '@/components/features/DeepDivePlayer';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { sectionId: string } }): Promise<Metadata> {
  return { title: 'Deep Dive · Examina' };
}

export default async function DeepDiveSectionPage({ params }: { params: { sectionId: string } }) {
  if (!isValidObjectId(params.sectionId)) redirect('/deepdive');

  await requireAuth();
  await connectMongoose();

  const section = await Section.findById(params.sectionId).lean();
  if (!section) redirect('/deepdive');

  const chapter = await Chapter.findById(section.chapterId).lean();
  if (!chapter || chapter.status !== 'published') redirect('/deepdive');

  return (
    <DeepDivePlayer
      sectionId={section._id.toString()}
      chapterId={chapter._id.toString()}
      chapterTitle={chapter.title}
      sectionTitle={section.title}
      sectionOrder={section.order}
      learningObjectives={section.learningObjectives ?? []}
    />
  );
}
