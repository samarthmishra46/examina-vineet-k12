import { Types, isValidObjectId } from 'mongoose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { FlashcardProgress, connectMongoose } from '@/lib/db/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  progressId: z.string().min(1),
  rating: z.enum(['easy', 'almost', 'confused']),
});

export async function POST(req: Request) {
  const user = await requireAuth();

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const { progressId, rating } = parsed.data;
  if (!isValidObjectId(progressId)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });

  await connectMongoose();

  const progress = await FlashcardProgress.findOne({
    _id: new Types.ObjectId(progressId),
    userId: new Types.ObjectId(user.id),
  });
  if (!progress) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Simple spaced repetition: easy doubles interval, confused resets to 1
  const currentInterval = progress.intervalDays ?? 1;
  let nextInterval: number;
  if (rating === 'easy') nextInterval = Math.min(currentInterval * 2, 30);
  else if (rating === 'almost') nextInterval = Math.max(currentInterval, 1);
  else nextInterval = 1; // confused

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + nextInterval);

  await FlashcardProgress.findByIdAndUpdate(progressId, {
    intervalDays: nextInterval,
    nextReviewAt: nextReview,
    lastRating: rating,
    $inc: { totalReviews: 1 },
  });

  return NextResponse.json({ nextInterval, nextReviewAt: nextReview });
}
