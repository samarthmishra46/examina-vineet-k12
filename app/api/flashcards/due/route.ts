import { Types } from 'mongoose';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { Flashcard, FlashcardProgress, connectMongoose } from '@/lib/db/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await requireAuth();
  await connectMongoose();

  const userId = new Types.ObjectId(user.id);
  const now = new Date();

  const dueProgress = await FlashcardProgress.find({
    userId,
    nextReviewAt: { $lte: now },
  })
    .sort({ nextReviewAt: 1 })
    .limit(20)
    .lean();

  if (dueProgress.length === 0) return NextResponse.json({ cards: [] });

  const cardIds = dueProgress.map((p) => p.flashcardId);
  const cards = await Flashcard.find({ _id: { $in: cardIds } }).lean();

  const cardMap = new Map(cards.map((c) => [c._id.toString(), c]));

  const result = dueProgress.map((p) => {
    const card = cardMap.get(p.flashcardId.toString());
    if (!card) return null;
    return {
      progressId: p._id.toString(),
      flashcardId: p.flashcardId.toString(),
      front: card.front,
      back: card.back,
      hint: card.hint,
      type: card.type,
      intervalDays: p.intervalDays,
      totalReviews: p.totalReviews,
    };
  }).filter(Boolean);

  return NextResponse.json({ cards: result });
}
