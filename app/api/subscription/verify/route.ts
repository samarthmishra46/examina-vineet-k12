import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { Subscription, connectMongoose } from '@/lib/db/models';
import { verifySubscriptionSignature, TRIAL_DAYS } from '@/lib/razorpay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  razorpay_subscription_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export async function POST(req: Request) {
  const user = await requireAuth();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const valid = verifySubscriptionSignature(
    razorpay_subscription_id,
    razorpay_payment_id,
    razorpay_signature,
  );
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  await connectMongoose();

  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);

  await Subscription.updateOne(
    {
      userId: new Types.ObjectId(user.id),
      razorpaySubscriptionId: razorpay_subscription_id,
    },
    { $set: { status: 'authenticated', trialEndDate } },
  );

  return NextResponse.json({ success: true });
}
