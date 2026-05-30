import { Types, isValidObjectId } from 'mongoose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { PracticeAttempt, Question, connectMongoose } from '@/lib/db/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  questionId: z.string().min(1),
  selectedIndex: z.number().int().min(0).max(3),
  timeTakenSeconds: z.number().min(0).max(3600),
  recoveredCorrectly: z.boolean().nullable().optional(),
  errorType: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const user = await requireAuth();

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { questionId, selectedIndex, timeTakenSeconds, recoveredCorrectly, errorType } =
    parsed.data;

  if (!isValidObjectId(questionId)) {
    return NextResponse.json({ error: 'Invalid questionId' }, { status: 400 });
  }

  await connectMongoose();

  const question = await Question.findById(questionId).lean();
  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

  const isCorrect = question.correctIndex === selectedIndex;

  await PracticeAttempt.create({
    userId: new Types.ObjectId(user.id),
    questionId: question._id,
    sectionId: question.sectionId,
    selectedIndex,
    isCorrect,
    errorType: errorType ?? null,
    timeTakenSeconds,
    recoveredCorrectly: recoveredCorrectly ?? null,
  });

  return NextResponse.json({
    isCorrect,
    correctIndex: question.correctIndex,
    solution: question.solution,
  });
}
