import { NextResponse } from 'next/server';
import { env } from '@/env';
import { requireAuth } from '@/lib/auth/helpers';
import { createHeyGenSession } from '@/lib/avatar/heygen';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/avatar/session
 * Mints a short-lived HeyGen LiveAvatar session token for the current user.
 * Returns 503 if HeyGen env vars aren't configured — the client treats that
 * as "avatar disabled" and silently hides the video pane (lesson plays via
 * local OpenAI TTS instead).
 */
export async function POST() {
  await requireAuth();

  const avatarId = env.NEXT_PUBLIC_HEYGEN_AVATAR_ID;
  if (!env.HEYGEN_API_KEY || !avatarId) {
    return NextResponse.json({ error: 'Avatar not configured' }, { status: 503 });
  }

  // Optional Indian voice override — set NEXT_PUBLIC_HEYGEN_VOICE_ID in env
  const voiceId = env.NEXT_PUBLIC_HEYGEN_VOICE_ID;

  try {
    const session = await createHeyGenSession(avatarId, voiceId);
    return NextResponse.json(session);
  } catch (err) {
    console.error('[avatar/session] failed:', err);
    return NextResponse.json({ error: 'Avatar session failed' }, { status: 502 });
  }
}
