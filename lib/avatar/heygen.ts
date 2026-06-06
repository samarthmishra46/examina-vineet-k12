import { env } from '@/env';

const LIVEAVATAR_BASE = 'https://api.liveavatar.com';

export interface HeyGenSession {
  sessionId: string;
  sessionToken: string;
  avatarId: string;
}

/**
 * Server-side: mint a LiveAvatar session token for a single lesson. We use
 * LITE mode — no LLM, no agent, just "repeat this text" — which matches our
 * use case (we send each narrate text and the avatar speaks it with built-in
 * lip-sync). The avatar's default voice is used.
 *
 * Docs: https://docs.liveavatar.com/api-reference/sessions/create-session-token
 */
export async function createHeyGenSession(
  avatarId: string,
  voiceId?: string,
): Promise<HeyGenSession> {
  const apiKey = env.HEYGEN_API_KEY;
  if (!apiKey) throw new Error('HEYGEN_API_KEY not set');

  const body: Record<string, unknown> = {
    mode: 'LITE',
    avatar_id: avatarId,
    is_sandbox: false,
    max_session_duration: 1800, // 30 min cap per session
  };
  // Pass a specific voice (e.g. an Indian English voice) when provided.
  if (voiceId) {
    body.voice = { voice_id: voiceId };
  }

  const res = await fetch(`${LIVEAVATAR_BASE}/v1/sessions/token`, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '<no body>');
    throw new Error(`HeyGen LiveAvatar token ${res.status}: ${body.slice(0, 400)}`);
  }

  const json = (await res.json()) as {
    code: number;
    message: string;
    data: { session_id: string; session_token: string };
  };

  return {
    sessionId: json.data.session_id,
    sessionToken: json.data.session_token,
    avatarId,
  };
}
