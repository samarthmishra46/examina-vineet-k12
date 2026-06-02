import { Types, isValidObjectId } from 'mongoose';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { Flashcard, FlashcardProgress, Section, Chapter, connectMongoose } from '@/lib/db/models';
import { generateFlashcards } from '@/lib/teaching/generate-flashcards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await requireAuth();

  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get('sectionId');
  if (!sectionId || !isValidObjectId(sectionId)) {
    return NextResponse.json({ error: 'Invalid sectionId' }, { status: 400 });
  }

  await connectMongoose();

  const section = await Section.findById(sectionId).lean();
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

  const chapter = await Chapter.findById(section.chapterId).lean();
  if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });

  // Don't regenerate if cards already exist for this section
  const existing = await Flashcard.countDocuments({ sectionId: section._id });
  if (existing > 0) {
    // Just ensure the user has progress entries for each card
    await ensureUserProgress(user.id, sectionId);
    return NextResponse.json({ count: existing, cached: true });
  }

  const cards = await generateFlashcards({
    sectionTitle: section.title,
    sectionDescription: section.description ?? '',
    learningObjectives: section.learningObjectives ?? [],
  });

  const docs = cards.map((c) => ({
    sectionId: section._id,
    chapterId: section.chapterId,
    front: c.front,
    back: c.back,
    hint: c.hint,
    type: c.type,
  }));

  const inserted = await Flashcard.insertMany(docs);

  // Create initial progress entries for the user
  const progressDocs = inserted.map((card) => ({
    userId: new Types.ObjectId(user.id),
    flashcardId: card._id,
    intervalDays: 1,
    nextReviewAt: new Date(),
    totalReviews: 0,
    lastRating: 'almost' as const,
  }));
  await FlashcardProgress.insertMany(progressDocs, { ordered: false }).catch(() => {
    // ignore duplicate key errors if called twice
  });

  return NextResponse.json({ count: inserted.length, cached: false });
}

async function ensureUserProgress(userId: string, sectionId: string) {
  const cards = await Flashcard.find({ sectionId }).select('_id').lean();
  const uid = new Types.ObjectId(userId);
  const existing = await FlashcardProgress.find({ userId: uid }).select('flashcardId').lean();
  const existingIds = new Set(existing.map((p) => p.flashcardId.toString()));

  const missing = cards
    .filter((c) => !existingIds.has(c._id.toString()))
    .map((c) => ({
      userId: uid,
      flashcardId: c._id,
      intervalDays: 1,
      nextReviewAt: new Date(),
      totalReviews: 0,
      lastRating: 'almost' as const,
    }));

  if (missing.length > 0) {
    await FlashcardProgress.insertMany(missing, { ordered: false }).catch(() => undefined);
  }
}
