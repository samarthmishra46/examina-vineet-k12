import { isValidObjectId } from 'mongoose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { Question, connectMongoose } from '@/lib/db/models';
import { diagnoseAnswer } from '@/lib/teaching/diagnose-answer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const RequestSchema = z.object({
  questionId: z.string().min(1),
  selectedIndex: z.number().int().min(0).max(3),
});

export async function POST(req: Request) {
  await requireAuth();

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { questionId, selectedIndex } = parsed.data;
  if (!isValidObjectId(questionId)) {
    return NextResponse.json({ error: 'Invalid questionId' }, { status: 400 });
  }

  await connectMongoose();

  const question = await Question.findById(questionId).lean();
  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

  if (question.correctIndex === selectedIndex) {
    return NextResponse.json({ error: 'Answer was correct — no diagnosis needed' }, { status: 400 });
  }

  const diagnosis = await diagnoseAnswer({
    questionText: question.text,
    options: question.options,
    correctIndex: question.correctIndex,
    selectedIndex,
    conceptTags: question.conceptTags,
    commonMistakeTags: question.commonMistakeTags,
  });

  return NextResponse.json(diagnosis);
}
