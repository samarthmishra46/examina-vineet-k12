import { NextResponse } from 'next/server';
import { Subscription, connectMongoose } from '@/lib/db/models';
import { verifyWebhookSignature } from '@/lib/razorpay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Razorpay subscription statuses we care about
const VALID_STATUSES = new Set([
  'created', 'authenticated', 'active', 'pending',
  'halted', 'cancelled', 'completed', 'expired',
]);

interface RazorpayWebhookEvent {
  event: string;
  payload?: {
    subscription?: {
      entity?: {
        id?: string;
        status?: string;
        current_end?: number;
      };
    };
  };
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const sub = event.payload?.subscription?.entity;
  if (!sub?.id) return NextResponse.json({ ok: true });

  await connectMongoose();

  const update: Record<string, unknown> = {};
  if (sub.status && VALID_STATUSES.has(sub.status)) {
    update.status = sub.status;
  }
  if (sub.current_end) {
    update.currentPeriodEnd = new Date(sub.current_end * 1000);
  }

  if (Object.keys(update).length > 0) {
    await Subscription.updateOne(
      { razorpaySubscriptionId: sub.id },
      { $set: update },
    );
  }

  return NextResponse.json({ ok: true });
}
