import { isValidObjectId } from 'mongoose';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { Question, WRITTEN_TYPES, connectMongoose } from '@/lib/db/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  await requireAuth();

  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get('sectionId');

  if (!sectionId || !isValidObjectId(sectionId)) {
    return NextResponse.json({ error: 'Invalid sectionId' }, { status: 400 });
  }

  await connectMongoose();

  // kind=objective (default): MCQ-shaped questions for the adaptive player.
  // kind=written: short/long board questions, graded by /api/practice/grade.
  const kind = searchParams.get('kind') === 'written' ? 'written' : 'objective';
  const typeFilter =
    kind === 'written' ? { type: { $in: WRITTEN_TYPES } } : { type: { $nin: WRITTEN_TYPES } };

  const questions = await Question.find({ sectionId, flagSuspended: { $ne: true },
    reviewStatus: { $ne: 'pending' },
    ...typeFilter })
    .sort({ difficulty: 1, createdAt: 1 })
    .lean();

  // Never send correctIndex, solution or markingScheme to the client.
  const safe = questions.map((q) => ({
    _id: q._id.toString(),
    // Case-based questions share a passage; prepend it so the existing player shows it.
    text: q.context ? `${q.context}\n\n${q.text}` : q.text,
    type: q.type,
    marks: q.marks ?? 1,
    options: q.options,
    difficulty: q.difficulty,
    timeExpectedSeconds: q.timeExpectedSeconds,
    conceptTags: q.conceptTags,
  }));

  return NextResponse.json({ questions: safe });
}
