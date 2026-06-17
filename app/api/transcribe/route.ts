import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/auth/helpers';
import { env } from '@/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

let _client: OpenAI | undefined;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 60_000, maxRetries: 2 });
  }
  return _client;
}

const MAX_BYTES = 25 * 1024 * 1024; // OpenAI audio upload limit

/**
 * POST /api/transcribe
 * Body: multipart/form-data with an `audio` file (webm/mp4/wav…).
 * Returns: { text } — the transcript via OpenAI Whisper.
 *
 * Used by the lesson mic instead of the browser's SpeechRecognition, whose
 * cloud backend is unavailable in many Chromium builds (returns "network").
 */
export async function POST(req: Request) {
  await requireAuth();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form body' }, { status: 400 });
  }

  const file = form.get('audio');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Audio too large' }, { status: 413 });
  }

  try {
    // gpt-4o-mini-transcribe is faster than whisper-1 and supports streaming,
    // so text reaches the client progressively instead of all at once.
    const stream = await getClient().audio.transcriptions.create({
      file,
      model: 'gpt-4o-mini-transcribe',
      language: 'en',
      stream: true,
    });

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'transcript.text.delta' && event.delta) {
              controller.enqueue(encoder.encode(event.delta));
            }
          }
        } catch (err) {
          console.error('[transcribe] stream error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(body, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[transcribe] failed:', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
  }
}
