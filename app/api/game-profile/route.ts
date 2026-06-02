import { Types } from 'mongoose';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { GameProfile, connectMongoose } from '@/lib/db/models';
import { getLevelProgress } from '@/lib/xp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await requireAuth();
  await connectMongoose();

  const profile = await GameProfile.findOne({ userId: new Types.ObjectId(user.id) }).lean();

  const xp = profile?.xp ?? 0;
  const streakDays = profile?.streakDays ?? 0;
  const progress = getLevelProgress(xp);

  return NextResponse.json({ xp, streakDays, ...progress });
}
