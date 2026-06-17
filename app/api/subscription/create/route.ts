import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { requireAuth } from '@/lib/auth/helpers';
import { Subscription, connectMongoose } from '@/lib/db/models';
import { getRazorpay, TRIAL_DAYS } from '@/lib/razorpay';
import { env } from '@/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const user = await requireAuth();
  await connectMongoose();

  const userId = new Types.ObjectId(user.id);

  // If already has an active subscription, return it
  const existing = await Subscription.findOne({ userId }).lean();
  if (existing) {
    const now = new Date();
    const isActive =
      existing.status === 'active' ||
      existing.status === 'authenticated' ||
      (existing.trialEndDate && existing.trialEndDate > now);
    if (isActive) {
      return NextResponse.json(
        { error: 'Already subscribed. Refresh the page.' },
        { status: 400 },
      );
    }
    // Expired or cancelled — delete so they can re-subscribe
    await Subscription.deleteOne({ userId });
  }

  const razorpay = getRazorpay();

  // Razorpay implements a free trial via `start_at`: the first charge is
  // deferred until that timestamp, so the customer is not billed during the
  // trial. `trial_period` is not a valid subscription field.
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);
  const startAt = Math.floor(trialEndDate.getTime() / 1000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = await (razorpay.subscriptions.create as any)({
    plan_id: env.RAZORPAY_PLAN_ID,
    total_count: 12,
    start_at: startAt,
    customer_notify: 1,
    notes: {
      userId: user.id,
      userEmail: user.email ?? '',
    },
  });

  await Subscription.create({
    userId,
    razorpaySubscriptionId: subscription.id as string,
    status: 'created',
    trialEndDate,
  });

  return NextResponse.json({
    subscriptionId: subscription.id as string,
    keyId: env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}
