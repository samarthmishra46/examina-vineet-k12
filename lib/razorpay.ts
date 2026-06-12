import Razorpay from 'razorpay';
import { createHmac } from 'crypto';
import { env } from '@/env';

let _client: Razorpay | undefined;

export function getRazorpay(): Razorpay {
  if (!_client) {
    _client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return _client;
}

// Verify signature from Razorpay checkout handler (subscription payment)
export function verifySubscriptionSignature(
  subscriptionId: string,
  paymentId: string,
  signature: string,
): boolean {
  const body = `${paymentId}|${subscriptionId}`;
  const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
}

// Verify webhook signature from Razorpay
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}

export const TRIAL_DAYS = 3;
export const PLAN_AMOUNT_PAISE = 99900; // ₹999
