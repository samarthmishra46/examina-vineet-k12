import type { Metadata } from 'next';
import { isValidObjectId } from 'mongoose';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/helpers';
import { Chapter, Section, connectMongoose } from '@/lib/db/models';
import { SpeedDrillPlayer } from '@/components/features/SpeedDrillPlayer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Speed Drill · Examina' };

export default async function DrillPage({ params }: { params: { sectionId: string } }) {
  if (!isValidObjectId(params.sectionId)) redirect('/drills');
  await requireAuth();
  await connectMongoose();

  const section = await Section.findById(params.sectionId).lean();
  if (!section) redirect('/drills');

  const chapter = await Chapter.findById(section.chapterId).lean();
  if (!chapter || chapter.status !== 'published') redirect('/drills');

  return (
    <SpeedDrillPlayer
      sectionId={params.sectionId}
      sectionTitle={section.title}
      chapterId={chapter._id.toString()}
      chapterTitle={chapter.title}
    />
  );
}
