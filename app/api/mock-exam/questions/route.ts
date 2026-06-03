import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { Question, Section, Chapter, connectMongoose } from '@/lib/db/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await requireAuth();
  await connectMongoose();

  // Get all published chapters
  const chapters = await Chapter.find({ status: 'published' }).select('_id').lean();
  if (!chapters.length) return NextResponse.json({ questions: [] });

  const chapterIds = chapters.map((c) => c._id);
  const sections = await Section.find({ chapterId: { $in: chapterIds } }).select('_id title').lean();
  if (!sections.length) return NextResponse.json({ questions: [] });

  const sectionIds = sections.map((s) => s._id);
  const sectionTitleMap = new Map(sections.map((s) => [s._id.toString(), s.title]));

  // Get all questions, sample up to 30 with a mix of difficulties
  const allQuestions = await Question.find({
    sectionId: { $in: sectionIds },
    flagSuspended: { $ne: true },
  })
    .select('_id text options difficulty timeExpectedSeconds sectionId conceptTags')
    .lean();

  if (!allQuestions.length) return NextResponse.json({ questions: [] });

  // Shuffle and take 30 (10 easy, 12 medium, 8 hard ideally)
  const byDiff = { 1: [] as typeof allQuestions, 2: [] as typeof allQuestions, 3: [] as typeof allQuestions };
  for (const q of allQuestions) {
    const d = (q.difficulty ?? 2) as 1 | 2 | 3;
    byDiff[d].push(q);
  }

  shuffle(byDiff[1]); shuffle(byDiff[2]); shuffle(byDiff[3]);

  const selected = [
    ...byDiff[1].slice(0, 10),
    ...byDiff[2].slice(0, 12),
    ...byDiff[3].slice(0, 8),
  ].slice(0, 30);

  shuffle(selected);

  const safe = selected.map((q) => ({
    _id: q._id.toString(),
    text: q.text,
    options: q.options,
    difficulty: q.difficulty,
    timeExpectedSeconds: q.timeExpectedSeconds,
    sectionTitle: sectionTitleMap.get(q.sectionId.toString()) ?? 'Unknown',
  }));

  return NextResponse.json({ questions: safe });
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}
