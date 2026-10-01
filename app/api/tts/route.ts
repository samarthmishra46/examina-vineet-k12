import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/helpers';
import { synthesizeSpeech } from '@/lib/tts/synthesize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RequestSchema = z.object({
  text: z.string().min(1).max(800),
  language: z.enum(['hinglish', 'english']).optional().default('english'),
});

/**
 * POST /api/tts
 * Body: { text, language }
 * Returns: audio/mpeg bytes for the given text via Sarvam bulbul:v3.
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
    const languageCode = parsed.data.language === 'hinglish' ? 'hi-IN' : 'en-IN';
    const audio = await synthesizeSpeech(parsed.data.text, undefined, languageCode);
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
