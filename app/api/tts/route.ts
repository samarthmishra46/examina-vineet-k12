import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { synthesizeSpeech } from '@/lib/tts/synthesize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RequestSchema = z.object({
  text: z.string().min(1).max(800),
});

/**
 * POST /api/tts
 * Body: { text }
 * Returns: audio/mpeg bytes for the given text via OpenAI tts-1 (nova voice).
 *
 * v1: no caching — every request re-synthesizes. v2 should hash-cache to Blob.
 */
export async function POST(req: Request) {
  await requireAuth();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const audio = await synthesizeSpeech(parsed.data.text);
    return new Response(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[tts] synthesis failed:', err);
    return NextResponse.json({ error: 'TTS failed' }, { status: 502 });
  }
}
