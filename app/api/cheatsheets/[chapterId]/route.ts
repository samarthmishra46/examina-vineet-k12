import { isValidObjectId } from 'mongoose';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { Chapter, CheatSheet, Section, connectMongoose } from '@/lib/db/models';
import { generateCheatSheet, type CheatCard } from '@/lib/teaching/generate-cheatsheet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: { chapterId: string } }) {
  await requireAuth();
  const { chapterId } = params;
  if (!isValidObjectId(chapterId)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });

  await connectMongoose();

  // Return cached version if it exists
  const cached = await CheatSheet.findOne({ chapterId }).lean();
  if (cached) return NextResponse.json({ cards: cached.cards as CheatCard[], cached: true });

  const chapter = await Chapter.findById(chapterId).lean();
  if (!chapter || chapter.status !== 'published') {
    return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
  }

  const sections = await Section.find({ chapterId: chapter._id }).sort({ order: 1 }).lean();
  const sectionsText = sections
    .map((s) => `${s.title}: ${(s.learningObjectives ?? []).join(', ')}`)
    .join('\n');

  let cards: CheatCard[];
  try {
    cards = await generateCheatSheet({
      chapterTitle: chapter.title,
      chapterDescription: chapter.description ?? '',
      sectionsText,
    });
  } catch (err) {
    console.error('[cheatsheets] generation failed:', err);
    return NextResponse.json({ error: 'Cheat sheet generation failed. Please try again.' }, { status: 502 });
  }

  await CheatSheet.create({ chapterId: chapter._id, cards });
  return NextResponse.json({ cards, cached: false });
}

// Bust the cache for a chapter (admin use)
export async function DELETE(_req: Request, { params }: { params: { chapterId: string } }) {
  await requireAuth();
  if (!isValidObjectId(params.chapterId)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });
  await connectMongoose();
  await CheatSheet.deleteOne({ chapterId: params.chapterId });
  return NextResponse.json({ ok: true });
}
