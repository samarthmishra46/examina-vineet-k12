import { isValidObjectId } from 'mongoose';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { Question, connectMongoose } from '@/lib/db/models';

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

  const questions = await Question.find({ sectionId, flagSuspended: { $ne: true } })
    .sort({ difficulty: 1, createdAt: 1 })
    .lean();

  // Strip correctIndex — never send to client. It's validated server-side on submit.
  const safe = questions.map((q) => ({
    _id: q._id.toString(),
    text: q.text,
    options: q.options,
    difficulty: q.difficulty,
    timeExpectedSeconds: q.timeExpectedSeconds,
    conceptTags: q.conceptTags,
  }));

  return NextResponse.json({ questions: safe });
}
