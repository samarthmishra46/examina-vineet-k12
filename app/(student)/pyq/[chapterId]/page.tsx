import type { Metadata } from 'next';
import { isValidObjectId } from 'mongoose';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/helpers';
import { Chapter, Question, Section, connectMongoose } from '@/lib/db/models';
import { PYQPlayer } from '@/components/features/PYQPlayer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Board Exam Questions · Examina' };

export default async function PYQChapterPage({ params }: { params: { chapterId: string } }) {
  if (!isValidObjectId(params.chapterId)) redirect('/pyq');

  await requireAuth();
  await connectMongoose();

  const chapter = await Chapter.findById(params.chapterId).lean();
  if (!chapter || chapter.status !== 'published') redirect('/pyq');

  const sections = await Section.find({ chapterId: chapter._id }).sort({ order: 1 }).lean();
  const sectionIds = sections.map((s) => s._id);

  const questions = await Question.find({
    sectionId: { $in: sectionIds },
    difficulty: 3,
    flagSuspended: { $ne: true },
  }).lean();

  const sectionTitleMap = new Map(sections.map((s) => [s._id.toString(), s.title]));

  const safeQuestions = questions.map((q) => ({
    _id: q._id.toString(),
    text: q.text,
    options: q.options,
    difficulty: q.difficulty as 1 | 2 | 3,
    timeExpectedSeconds: q.timeExpectedSeconds,
    sectionTitle: sectionTitleMap.get(q.sectionId.toString()) ?? '',
  }));

  return (
    <PYQPlayer
      chapterTitle={chapter.title}
      chapterId={params.chapterId}
      questions={safeQuestions}
    />
  );
}
