import crypto from 'crypto';
import OpenAI from 'openai';
import { list, put } from '@vercel/blob';
import { env } from '@/env';

let _client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      // OpenAI TTS can spike to 20-30s from India under load
      timeout: 60_000,
      maxRetries: 2,
    });
  }
  return _client;
}

export type TtsVoice = 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer';

// nova: warm, energetic, expressive — best for teaching persona
export const DEFAULT_VOICE: TtsVoice = 'nova';

// L1: in-memory per serverless instance (survives warm re-invocations on Fluid Compute)
const memCache = new Map<string, ArrayBuffer>();

/**
 * Synthesize text to mp3 via OpenAI tts-1-hd.
 *
 * Caching layers:
 *   L1 — in-memory Map: 0 ms, per function instance
 *   L2 — Vercel Blob: ~50–100 ms lookup, cross-instance, 30-day TTL
 *
 * On cache miss: calls OpenAI (~8–15 s), then writes to both caches.
 * Cache hit rate is high for repeated lesson phrases and common narrations.
 */
export async function synthesizeSpeech(
  text: string,
  voice: TtsVoice = DEFAULT_VOICE,
): Promise<ArrayBuffer> {
  const cacheKey = crypto
    .createHash('sha1')
    .update(`${voice}:${text}`)
    .digest('hex');

  // L1: in-memory
  const memHit = memCache.get(cacheKey);
  if (memHit) return memHit;

  // L2: Vercel Blob
  const blobPath = `tts-cache/${cacheKey}.mp3`;
  try {
    const { blobs } = await list({ prefix: blobPath, limit: 1 });
    if (blobs[0]) {
      const res = await fetch(blobs[0].url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        memCache.set(cacheKey, buf);
        return buf;
      }
    }
  } catch {
    // Blob unavailable — fall through to OpenAI
  }

  // Generate via OpenAI tts-1-hd (higher quality, more natural prosody)
  const response = await getClient().audio.speech.create({
    model: 'tts-1-hd',
    voice,
    input: text,
    response_format: 'mp3',
  });
  const buffer = await response.arrayBuffer();

  // Populate both caches (blob write is fire-and-forget)
  memCache.set(cacheKey, buffer);
  void put(blobPath, Buffer.from(buffer), {
    access: 'public',
    contentType: 'audio/mpeg',
    addRandomSuffix: false,
    cacheControlMaxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return buffer;
}
