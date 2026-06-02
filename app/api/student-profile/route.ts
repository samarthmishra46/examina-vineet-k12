import { Types } from 'mongoose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { StudentProfile, connectMongoose } from '@/lib/db/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await requireAuth();
  await connectMongoose();

  const profile = await StudentProfile.findOne({
    userId: new Types.ObjectId(user.id),
  }).lean();

  return NextResponse.json({ profile: profile ?? null });
}

const PostSchema = z.object({
  firstName: z.string().min(1).max(50),
  class: z.number().int().min(6).max(12),
  board: z.enum(['CBSE', 'ICSE', 'State', 'Other']),
  goalType: z.enum(['boards_90', 'jee', 'neet', 'general', 'weak_subject']).optional(),
});

export async function POST(req: Request) {
  const user = await requireAuth();

  const body = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  await connectMongoose();

  await StudentProfile.findOneAndUpdate(
    { userId: new Types.ObjectId(user.id) },
    { ...parsed.data, userId: new Types.ObjectId(user.id) },
    { upsert: true, new: true },
  );

  return NextResponse.json({ ok: true });
}
