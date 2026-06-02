import { Types } from 'mongoose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { GameProfile, connectMongoose } from '@/lib/db/models';
import { XP_ACTIONS, getLevelFromXP, type XPAction } from '@/lib/xp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  action: z.enum(Object.keys(XP_ACTIONS) as [XPAction, ...XPAction[]]),
});

export async function POST(req: Request) {
  const user = await requireAuth();

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const { action } = parsed.data;
  const amount = XP_ACTIONS[action];

  await connectMongoose();

  const userId = new Types.ObjectId(user.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const profile = await GameProfile.findOne({ userId }).lean();
  const currentXP = profile?.xp ?? 0;
  const prevLevel = getLevelFromXP(currentXP);

  // Streak logic: if last activity was yesterday, increment; if today already, no change; else reset
  let streakDays = profile?.streakDays ?? 0;
  const lastDate = profile?.streakLastDate ? new Date(profile.streakLastDate) : null;
  if (lastDate) {
    lastDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - lastDate.getTime()) / 86400000);
    if (diffDays === 1) streakDays += 1;
    else if (diffDays > 1) streakDays = 1;
    // diffDays === 0 means same day, no streak change
  } else {
    streakDays = 1;
  }

  // 7-day streak bonus
  let totalXP = amount;
  if (streakDays > 0 && streakDays % 7 === 0) {
    totalXP += XP_ACTIONS.streak_7_days;
  }

  const newXP = currentXP + totalXP;
  const newLevel = getLevelFromXP(newXP);
  const leveledUp = newLevel > prevLevel;

  await GameProfile.findOneAndUpdate(
    { userId },
    {
      $inc: { xp: totalXP },
      $set: { streakDays, streakLastDate: today },
    },
    { upsert: true },
  );

  return NextResponse.json({ xpAwarded: totalXP, newXP, newLevel, leveledUp, streakDays });
}
