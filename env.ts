import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * Typed environment variables. Add to `server`/`client` and `runtimeEnv`
 * as each build step introduces a new dependency.
 *
 * Step 2 (auth):  AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, MONGODB_URI
 * Step 4 (admin): ANTHROPIC_API_KEY, BLOB_READ_WRITE_TOKEN
 * Step 7 (tts):   OPENAI_API_KEY
 * Avatar (opt.):  HEYGEN_API_KEY, NEXT_PUBLIC_HEYGEN_AVATAR_ID,
 *                 NEXT_PUBLIC_HEYGEN_VOICE_ID
 */
export const env = createEnv({
  server: {
    AUTH_SECRET: z.string().min(1),
    AUTH_GOOGLE_ID: z.string().min(1),
    AUTH_GOOGLE_SECRET: z.string().min(1),
    MONGODB_URI: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    // Optional: when missing, the HeyGen avatar silently disables itself
    // and the lesson plays via OpenAI TTS only.
    HEYGEN_API_KEY: z.string().min(1).optional(),
  },
  client: {
    // Public — clients need the avatar id to start the streaming session.
    NEXT_PUBLIC_HEYGEN_AVATAR_ID: z.string().min(1).optional(),
    // Optional voice override; if missing, HeyGen uses the avatar's default voice.
    NEXT_PUBLIC_HEYGEN_VOICE_ID: z.string().min(1).optional(),
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
    NEXT_PUBLIC_HEYGEN_AVATAR_ID: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID,
    NEXT_PUBLIC_HEYGEN_VOICE_ID: process.env.NEXT_PUBLIC_HEYGEN_VOICE_ID,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === '1',
});
