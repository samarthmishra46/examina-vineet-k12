import { Types, isValidObjectId } from 'mongoose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { PracticeAttempt, Question, connectMongoose } from '@/lib/db/models';
import { diagnoseAnswer } from '@/lib/teaching/diagnose-answer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const RequestSchema = z.object({
  questionId: z.string().min(1),
  selectedIndex: z.number().int().min(0).max(3),
});

export async function POST(req: Request) {
  const user = await requireAuth();

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

  if (question.correctIndex == null) {
    return NextResponse.json({ error: 'Not an objective question' }, { status: 400 });
  }

  if (question.correctIndex === selectedIndex) {
    return NextResponse.json({ error: 'Answer was correct — no diagnosis needed' }, { status: 400 });
  }

  // Only diagnose answers the student really submitted (and got wrong), so the
  // endpoint can't be used to run arbitrary paid model calls.
  const attempted = await PracticeAttempt.exists({
    userId: new Types.ObjectId(user.id),
    questionId: question._id,
    selectedIndex,
    isCorrect: false,
  });
  if (!attempted) {
    return NextResponse.json({ error: 'No matching wrong attempt' }, { status: 403 });
  }

  try {
    const diagnosis = await diagnoseAnswer({
      questionText: question.text,
      options: question.options,
      correctIndex: question.correctIndex,
      selectedIndex,
      conceptTags: question.conceptTags,
      commonMistakeTags: question.commonMistakeTags,
    });
    return NextResponse.json(diagnosis);
  } catch (err) {
    console.error('Diagnosis failed', err);
    return NextResponse.json({ error: 'Diagnosis unavailable' }, { status: 502 });
  }
}
