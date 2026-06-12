import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    AUTH_SECRET: z.string().min(1),
    AUTH_GOOGLE_ID: z.string().min(1),
    AUTH_GOOGLE_SECRET: z.string().min(1),
    MONGODB_URI: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    // Optional: when missing HeyGen avatar silently disables itself
    HEYGEN_API_KEY: z.string().min(1).optional(),
    // Razorpay — test keys start with rzp_test_, live keys with rzp_live_
    RAZORPAY_KEY_ID: z.string().min(1),
    RAZORPAY_KEY_SECRET: z.string().min(1),
    RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
    // Created in Razorpay dashboard: ₹999/month, interval=monthly
    RAZORPAY_PLAN_ID: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_HEYGEN_AVATAR_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_HEYGEN_VOICE_ID: z.string().min(1).optional(),
    // Same as RAZORPAY_KEY_ID — needed by Razorpay checkout.js on client
    NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(1),
  },
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    MONGODB_URI: process.env.MONGODB_URI,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    HEYGEN_API_KEY: process.env.HEYGEN_API_KEY,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    RAZORPAY_PLAN_ID: process.env.RAZORPAY_PLAN_ID,
    NEXT_PUBLIC_HEYGEN_AVATAR_ID: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID,
    NEXT_PUBLIC_HEYGEN_VOICE_ID: process.env.NEXT_PUBLIC_HEYGEN_VOICE_ID,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === '1',
});
