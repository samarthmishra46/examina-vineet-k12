import { isValidObjectId } from 'mongoose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/helpers';
import { Chapter, Question, Section, connectMongoose } from '@/lib/db/models';
import { generateQuestions } from '@/lib/teaching/generate-questions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const RequestSchema = z.object({ sectionId: z.string().min(1) });

export async function POST(req: Request) {
  await requireAdmin();

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { sectionId } = parsed.data;
  if (!isValidObjectId(sectionId)) {
    return NextResponse.json({ error: 'Invalid section id' }, { status: 400 });
  }

  await connectMongoose();

  const section = await Section.findById(sectionId).lean();
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

  const chapter = await Chapter.findById(section.chapterId).lean();
  if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });

  const questions = await generateQuestions({
    chapterTitle: chapter.title,
    sectionTitle: section.title,
    sectionDescription: section.description ?? '',
    learningObjectives: section.learningObjectives ?? [],
  });

  // Wipe any existing questions for this section before inserting new ones.
  await Question.deleteMany({ sectionId: section._id });

  const docs = questions.map((q) => ({
    sectionId: section._id,
    chapterId: section.chapterId,
    text: q.text,
    type: 'mcq' as const,
    difficulty: q.difficulty,
    options: q.options,
    correctIndex: q.correctIndex,
    solution: q.solution,
    conceptTags: q.conceptTags,
    commonMistakeTags: q.commonMistakeTags,
    timeExpectedSeconds: q.timeExpectedSeconds,
  }));

  await Question.insertMany(docs);

  return NextResponse.json({ count: docs.length });
}
