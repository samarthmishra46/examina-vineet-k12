import OpenAI from 'openai';
import { env } from '@/env';

let _client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      // OpenAI's TTS endpoint can spike to 20-30s under load (especially
      // from India). Default timeout was hitting at ~30s causing 502s.
      timeout: 60_000,
      maxRetries: 3,
    });
  }
  return _client;
}

export type TtsVoice = 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer';

export const DEFAULT_VOICE: TtsVoice = 'nova';

/**
 * Synthesize a single sentence to mp3 via OpenAI tts-1.
 * Returns raw mp3 bytes — the caller turns it into a Response or buffers it.
 */
export async function synthesizeSpeech(
  text: string,
  voice: TtsVoice = DEFAULT_VOICE,
): Promise<ArrayBuffer> {
  const client = getClient();
  const response = await client.audio.speech.create({
    model: 'tts-1',
    voice,
    input: text,
    response_format: 'mp3',
  });
  return response.arrayBuffer();
}
