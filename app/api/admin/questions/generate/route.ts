import { isValidObjectId } from 'mongoose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/helpers';
import { Chapter, Question, Section, WRITTEN_TYPES, connectMongoose } from '@/lib/db/models';
import { generateQuestions } from '@/lib/teaching/generate-questions';
import { generateWrittenQuestions } from '@/lib/teaching/generate-written-questions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const RequestSchema = z.object({
  sectionId: z.string().min(1),
  mode: z.enum(['objective', 'written']).default('objective'),
});

export async function POST(req: Request) {
  await requireAdmin();

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { sectionId, mode } = parsed.data;
  if (!isValidObjectId(sectionId)) {
    return NextResponse.json({ error: 'Invalid section id' }, { status: 400 });
  }

  await connectMongoose();

  const section = await Section.findById(sectionId).lean();
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

  const chapter = await Chapter.findById(section.chapterId).lean();
  if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });

  try {
    const params = {
      chapterTitle: chapter.title,
      sectionTitle: section.title,
      sectionDescription: section.description ?? '',
      learningObjectives: section.learningObjectives ?? [],
    };

    const base = {
      sectionId: section._id,
      chapterId: section.chapterId,
      source: 'generated' as const,
    };
    const docs =
      mode === 'written'
        ? (await generateWrittenQuestions(params)).map((q) => ({
            ...base,
            text: q.text,
            type: q.type,
            marks: q.marks,
            difficulty: q.difficulty,
            solution: q.solution,
            markingScheme: q.markingScheme,
            conceptTags: q.conceptTags,
            timeExpectedSeconds: q.timeExpectedSeconds,
          }))
        : (await generateQuestions(params)).map((q) => ({
            ...base,
            text: q.text,
            type: 'mcq' as const,
            difficulty: q.difficulty,
            options: q.options,
            correctIndex: q.correctIndex,
            solution: q.solution,
            conceptTags: q.conceptTags,
            commonMistakeTags: q.commonMistakeTags,
            timeExpectedSeconds: q.timeExpectedSeconds,
          }));

    // Only replace generated questions of the same mode (legacy docs have no `source`, so match
    // by exclusion): imported board papers must survive. Insert first, then delete the old ones,
    // so a failed insert never leaves the section empty.
    const modeFilter =
      mode === 'written' ? { type: { $in: WRITTEN_TYPES } } : { type: { $nin: WRITTEN_TYPES } };
    const previous = await Question.find({
      sectionId: section._id,
      source: { $nin: ['pyq', 'sample_paper'] },
      ...modeFilter,
    })
      .select('_id')
      .lean();

    await Question.insertMany(docs);
    if (previous.length > 0) {
      await Question.deleteMany({ _id: { $in: previous.map((q) => q._id) } });
    }

    return NextResponse.json({ count: docs.length });
  } catch (err) {
    console.error('[admin/questions/generate] failed:', err);
    // Admin-only route — safe to surface the real error for debugging.
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Question generation failed: ${detail}` }, { status: 502 });
  }
}
