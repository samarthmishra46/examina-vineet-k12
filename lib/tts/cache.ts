/**
 * TTS cache stub. The brief reserves a slot for hash-keyed caching of
 * generated audio (Vercel Blob / S3) so repeat narrations across lessons
 * and students don't re-cost OpenAI. v1 ships without caching — every
 * request re-synthesizes.
 *
 * v2 should:
 *   - hash(voice + text) -> blob key
 *   - get(key): Promise<ArrayBuffer | null>
 *   - put(key, audio): Promise<void>
 *   - track hit/miss metrics
 */

export type AudioCache = {
  get(key: string): Promise<ArrayBuffer | null>;
  put(key: string, audio: ArrayBuffer): Promise<void>;
};

export const noopCache: AudioCache = {
  async get() {
    return null;
  },
  async put() {
    // no-op
  },
};
