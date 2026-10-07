'use server';

import { del } from '@vercel/blob';
import { Types, isValidObjectId } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/helpers';
import { Paper, Question, Section, WRITTEN_TYPES, connectMongoose } from '@/lib/db/models';

const UpdateQuestionSchema = z.object({
  text: z.string().min(1).max(3000).optional(),
  options: z.array(z.string().min(1).max(400)).length(4).optional(),
  correctIndex: z.number().int().min(0).max(3).nullable().optional(),
  marks: z.number().int().min(1).max(6).optional(),
  solution: z.string().max(3000).optional(),
  markingScheme: z.array(z.string().min(1).max(400)).max(10).optional(),
  sectionId: z.string().nullable().optional(),
  hasFigure: z.boolean().optional(),
});

export async function updatePaperQuestion(
  questionId: string,
  patch: z.infer<typeof UpdateQuestionSchema>,
): Promise<void> {
  await requireAdmin();
  if (!isValidObjectId(questionId)) throw new Error('Invalid question id');
  const parsed = UpdateQuestionSchema.parse(patch);
  await connectMongoose();

  const set: Record<string, unknown> = { ...parsed };
  delete set.sectionId;
  if (parsed.sectionId !== undefined) {
    if (parsed.sectionId === null || parsed.sectionId === '') {
      set.sectionId = null;
      set.chapterId = null;
    } else {
      if (!isValidObjectId(parsed.sectionId)) throw new Error('Invalid section id');
      const section = await Section.findById(parsed.sectionId).select('chapterId').lean();
      if (!section) throw new Error('Section not found');
      set.sectionId = section._id;
      set.chapterId = section.chapterId;
    }
  }
  const question = await Question.findOneAndUpdate(
    { _id: questionId, reviewStatus: 'pending' },
    { $set: set },
  )
    .select('paperId')
    .lean();
  if (!question) throw new Error('Question not found or already published');
  if (question.paperId) revalidatePath(`/admin/papers/${question.paperId.toString()}`);
}

export async function deletePaperQuestion(questionId: string): Promise<void> {
  await requireAdmin();
  if (!isValidObjectId(questionId)) throw new Error('Invalid question id');
  await connectMongoose();
  const q = await Question.findOneAndDelete({ _id: questionId, reviewStatus: 'pending' })
    .select('paperId')
    .lean();
  if (q?.paperId) revalidatePath(`/admin/papers/${q.paperId.toString()}`);
}

/** Approve every question in the paper and make it visible to students. Validates first. */
export async function publishPaper(paperId: string): Promise<void> {
  await requireAdmin();
  if (!isValidObjectId(paperId)) throw new Error('Invalid paper id');
  await connectMongoose();
  const pid = new Types.ObjectId(paperId);

  const questions = await Question.find({ paperId: pid, reviewStatus: 'pending' }).lean();
  if (questions.length === 0) throw new Error('Nothing to publish.');

  const problems: string[] = [];
  for (const q of questions) {
    const label = `Q${q.paperQuestionNo ?? '?'}`;
    if (!q.sectionId) problems.push(`${label}: pick a section`);
    const written = (WRITTEN_TYPES as readonly string[]).includes(q.type ?? '');
    if (written && q.markingScheme.length === 0) problems.push(`${label}: missing marking scheme`);
    if (!written && (q.options.length !== 4 || q.correctIndex == null)) {
      problems.push(`${label}: needs 4 options and a correct answer`);
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `Fix before publishing — ${problems.slice(0, 6).join('; ')}${problems.length > 6 ? ` (+${problems.length - 6} more)` : ''}`,
    );
  }

  await Question.updateMany({ paperId: pid, reviewStatus: 'pending' }, { $set: { reviewStatus: 'approved' } });
  await Paper.updateOne({ _id: pid }, { $set: { status: 'published' } });
  revalidatePath('/admin/papers');
  revalidatePath(`/admin/papers/${paperId}`);
}

export async function deletePaper(paperId: string): Promise<void> {
  await requireAdmin();
  if (!isValidObjectId(paperId)) throw new Error('Invalid paper id');
  await connectMongoose();
  const paper = await Paper.findById(paperId).select('sourceUrl answerKeyUrl').lean();
  await Question.deleteMany({ paperId });
  await Paper.deleteOne({ _id: paperId });
  for (const url of [paper?.sourceUrl, paper?.answerKeyUrl]) {
    if (url) {
      try {
        await del(url);
      } catch {
        // Best-effort cleanup.
      }
    }
  }
  revalidatePath('/admin/papers');
}
