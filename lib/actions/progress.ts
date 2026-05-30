'use server';

import { Types, isValidObjectId } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/helpers';
import { Progress, Section, connectMongoose } from '@/lib/db/models';

/**
 * Mark a section as in-progress for the current user. No-op if the section
 * is already marked completed (don't downgrade).
 */
export async function markSectionStarted(sectionId: string): Promise<void> {
  if (!isValidObjectId(sectionId)) return;
  const user = await requireAuth();
  await connectMongoose();

  const userId = new Types.ObjectId(user.id);
  const sId = new Types.ObjectId(sectionId);

  const existing = await Progress.findOne({ userId, sectionId: sId })
    .select('status')
    .lean();
  if (existing?.status === 'completed') return;

  await Progress.updateOne(
    { userId, sectionId: sId },
    {
      $setOnInsert: { userId, sectionId: sId },
      $set: { status: 'in_progress' },
    },
    { upsert: true },
  );

  await revalidateRoadmaps(sId);
}

/**
 * Mark a section as completed. Always updates completedAt to now (re-completing
 * refreshes the date — acceptable for v1).
 */
export async function markSectionCompleted(sectionId: string): Promise<void> {
  if (!isValidObjectId(sectionId)) return;
  const user = await requireAuth();
  await connectMongoose();

  const userId = new Types.ObjectId(user.id);
  const sId = new Types.ObjectId(sectionId);

  await Progress.updateOne(
    { userId, sectionId: sId },
    {
      $setOnInsert: { userId, sectionId: sId },
      $set: { status: 'completed', completedAt: new Date() },
    },
    { upsert: true },
  );

  await revalidateRoadmaps(sId);
}

async function revalidateRoadmaps(sectionId: Types.ObjectId): Promise<void> {
  const section = await Section.findById(sectionId).select('chapterId').lean();
  revalidatePath('/dashboard');
  if (section) {
    revalidatePath(`/chapter/${section.chapterId.toString()}`);
  }
}
