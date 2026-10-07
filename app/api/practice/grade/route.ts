import { Types, isValidObjectId } from 'mongoose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { PracticeAttempt, Question, WRITTEN_TYPES, connectMongoose } from '@/lib/db/models';
import { gradeAnswer } from '@/lib/teaching/grade-answer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Each grading call is a paid model call: cap how often one student can regrade one question.
const MAX_GRADES_PER_QUESTION_PER_HOUR = 3;

const RequestSchema = z.object({
  questionId: z.string().min(1),
  answerText: z.string().trim().min(10).max(4000),
  timeTakenSeconds: z.number().min(0).max(7200),
});

export async function POST(req: Request) {
  const user = await requireAuth();

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Write at least a couple of lines (10–4000 characters).' },
      { status: 400 },
    );
  }
  const { questionId, answerText, timeTakenSeconds } = parsed.data;
  if (!isValidObjectId(questionId)) {
    return NextResponse.json({ error: 'Invalid questionId' }, { status: 400 });
  }

  await connectMongoose();
  const userId = new Types.ObjectId(user.id);

  const question = await Question.findById(questionId).lean();
  if (!question || !(WRITTEN_TYPES as readonly string[]).includes(question.type ?? '')) {
    return NextResponse.json({ error: 'Written question not found' }, { status: 404 });
  }
  if (!question.sectionId || question.reviewStatus === 'pending') {
    return NextResponse.json({ error: 'Question not available' }, { status: 404 });
  }
  if (question.markingScheme.length === 0) {
    return NextResponse.json({ error: 'Question has no marking scheme' }, { status: 409 });
  }

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await PracticeAttempt.countDocuments({
    userId,
    questionId: question._id,
    createdAt: { $gte: since },
  });
  if (recent >= MAX_GRADES_PER_QUESTION_PER_HOUR) {
    return NextResponse.json(
      { error: 'Too many attempts on this question — try again in a while.' },
      { status: 429 },
    );
  }

  const maxMarks = question.marks ?? 1;
  let grade;
  try {
    grade = await gradeAnswer({
      questionText: question.text,
      marks: maxMarks,
      solution: question.solution,
      markingScheme: question.markingScheme,
      studentAnswer: answerText,
    });
  } catch (err) {
    console.error('Grading failed', err);
    return NextResponse.json({ error: 'Grading unavailable, please retry.' }, { status: 502 });
  }

  const previousAttempts = await PracticeAttempt.countDocuments({ userId, questionId: question._id });
  await PracticeAttempt.create({
    userId,
    questionId: question._id,
    sectionId: question.sectionId,
    attemptNo: previousAttempts + 1,
    // "Correct" for written answers means at least 75% of the marks.
    isCorrect: grade.marksAwarded >= maxMarks * 0.75,
    answerText,
    marksAwarded: grade.marksAwarded,
    maxMarks,
    feedback: grade.feedback,
    timeTakenSeconds,
  });

  return NextResponse.json({
    marksAwarded: grade.marksAwarded,
    maxMarks,
    pointsEarned: grade.pointsEarned,
    pointsMissed: grade.pointsMissed,
    feedback: grade.feedback,
    modelAnswer: question.solution,
    markingScheme: question.markingScheme,
  });
}
