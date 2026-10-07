import { Types, isValidObjectId } from 'mongoose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { PracticeAttempt, Question, connectMongoose } from '@/lib/db/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ERROR_TYPES = [
  'CONCEPT_GAP',
  'FORMULA_WRONG',
  'SIGN_ERROR',
  'CALCULATION_ERROR',
  'MISREAD_QUESTION',
  'NEAR_MISS',
] as const;

const RequestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('answer'),
    questionId: z.string().min(1),
    selectedIndex: z.number().int().min(0).max(3),
    timeTakenSeconds: z.number().min(0).max(3600),
  }),
  // Follow-up after a wrong answer: records the micro-question result on the
  // existing attempt instead of creating a second (falsely "correct") attempt.
  z.object({
    kind: z.literal('recovery'),
    questionId: z.string().min(1),
    recoveredCorrectly: z.boolean(),
    errorType: z.enum(ERROR_TYPES).nullable().optional(),
  }),
]);

export async function POST(req: Request) {
  const user = await requireAuth();

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const data = parsed.data;
  if (!isValidObjectId(data.questionId)) {
    return NextResponse.json({ error: 'Invalid questionId' }, { status: 400 });
  }

  await connectMongoose();
  const userId = new Types.ObjectId(user.id);

  if (data.kind === 'recovery') {
    const latest = await PracticeAttempt.findOne({
      userId,
      questionId: data.questionId,
      isCorrect: false,
    }).sort({ createdAt: -1 });
    if (!latest) return NextResponse.json({ error: 'No wrong attempt to recover' }, { status: 404 });
    latest.recoveredCorrectly = data.recoveredCorrectly;
    latest.errorType = data.errorType ?? null;
    await latest.save();
    return NextResponse.json({ ok: true });
  }

  const question = await Question.findById(data.questionId).lean();
  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

  if (!question.sectionId || question.reviewStatus === 'pending') {
    return NextResponse.json({ error: 'Question not available' }, { status: 404 });
  }
  if (question.correctIndex == null) {
    return NextResponse.json({ error: 'Use /api/practice/grade for written questions' }, { status: 400 });
  }

  const isCorrect = question.correctIndex === data.selectedIndex;
  const previousAttempts = await PracticeAttempt.countDocuments({
    userId,
    questionId: question._id,
  });

  await PracticeAttempt.create({
    userId,
    questionId: question._id,
    sectionId: question.sectionId,
    selectedIndex: data.selectedIndex,
    attemptNo: previousAttempts + 1,
    isCorrect,
    timeTakenSeconds: data.timeTakenSeconds,
  });

  return NextResponse.json({
    isCorrect,
    correctIndex: question.correctIndex,
    solution: question.solution,
  });
}
