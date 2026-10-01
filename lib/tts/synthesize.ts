import crypto from 'crypto';
import { SarvamAIClient } from 'sarvamai';
import { list, put } from '@vercel/blob';
import { env } from '@/env';

let _client: SarvamAIClient | undefined;

function getClient(): SarvamAIClient {
  if (!_client) {
    _client = new SarvamAIClient({ apiSubscriptionKey: env.SARVAM_API_KEY });
  }
  return _client;
}

export type TtsVoice =
  | 'rahul' | 'aditya' | 'vijay' | 'shubh' | 'dev' | 'amit' | 'rohan'
  | 'ritu' | 'priya' | 'neha' | 'pooja' | 'simran' | 'kavya';

export type TtsLanguageCode = 'hi-IN' | 'en-IN';

// rahul: warm, confident, coaching-teacher cadence — chosen for Aryan Sir after
// listening comparison against aditya/vijay (2026-10-01). Same speaker works
// for both language codes — Sarvam's voices aren't language-locked.
export const DEFAULT_VOICE: TtsVoice = 'rahul';
export const DEFAULT_LANGUAGE_CODE: TtsLanguageCode = 'hi-IN';

// L1: in-memory per serverless instance (survives warm re-invocations on Fluid Compute)
const memCache = new Map<string, ArrayBuffer>();

/**
 * Synthesize Hinglish text to mp3 via Sarvam AI (bulbul:v3, hi-IN).
 * Sarvam's hi-IN language code natively handles code-mixed Hindi/English text
 * ("Is question mein percentage ko fraction mein convert karo") without the
 * mispronunciation issues English-first TTS providers have with Hinglish.
 *
 * Caching layers:
 *   L1 — in-memory Map: 0 ms, per function instance
 *   L2 — Vercel Blob: ~50–100 ms lookup, cross-instance, 30-day TTL
 *
 * On cache miss: calls Sarvam, then writes to both caches. Cache hit rate is
 * high since lessons are generated once per sub-topic and reused across students.
 */
export async function synthesizeSpeech(
  text: string,
  voice: TtsVoice = DEFAULT_VOICE,
  languageCode: TtsLanguageCode = DEFAULT_LANGUAGE_CODE,
): Promise<ArrayBuffer> {
  const cacheKey = crypto
    .createHash('sha1')
    .update(`sarvam:${languageCode}:${voice}:${text}`)
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
    // Blob unavailable — fall through to Sarvam
  }

  // Generate via Sarvam bulbul:v3
  const response = await getClient().textToSpeech.convert({
    text,
    language_code: languageCode,
    speaker: voice,
    model: 'bulbul:v3',
    output_audio_codec: 'mp3',
  });
  const base64Audio = response.audios[0];
  if (!base64Audio) throw new Error('Sarvam TTS returned no audio');
  const nodeBuffer = Buffer.from(base64Audio, 'base64');
  // Buffer.buffer may be a larger pooled ArrayBuffer — slice to the actual bytes.
  const buffer = nodeBuffer.buffer.slice(
    nodeBuffer.byteOffset,
    nodeBuffer.byteOffset + nodeBuffer.byteLength,
  ) as ArrayBuffer;

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
