'use client';

import {
  AgentEventsEnum,
  LiveAvatarSession,
  SessionEvent,
} from '@heygen/liveavatar-web-sdk';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ForwardedRef,
} from 'react';

interface HeyGenSessionResponse {
  sessionId: string;
  sessionToken: string;
  avatarId: string;
}

export interface HeyGenAvatarHandle {
  /**
   * Make the avatar speak the given text. Resolves when the avatar finishes
   * speaking (AVATAR_SPEAK_ENDED event). Rejects on a 30s timeout or if the
   * session is not ready.
   */
  say(text: string): Promise<void>;
  /** Stop current speech immediately (skip). */
  interrupt(): void;
}

interface Props {
  className?: string;
  /** Fired once the LiveKit stream is ready (avatar visible on screen). */
  onReady?: () => void;
  /** Fired when setup fails or the session disconnects unexpectedly. */
  onFailed?: () => void;
}

type Status = 'idle' | 'connecting' | 'ready' | 'failed';

// 10s, not 30s — if HeyGen doesn't speak by then the WebRTC stream is wedged
// and we want to fall back to OpenAI TTS quickly instead of leaving the
// student listening to silence.
const SPEAK_TIMEOUT_MS = 10_000;

/**
 * HeyGen LiveAvatar wrapper. Mints a session via /api/avatar/session, opens
 * the LiveKit connection via the SDK, attaches the avatar video stream to
 * our <video> element. Voice + lip sync come from HeyGen — perfectly aligned
 * by construction.
 *
 * If session creation fails (env not set / API error), onFailed fires and
 * the component renders nothing. The lesson falls back to local OpenAI TTS.
 */
function HeyGenAvatarImpl(
  { className, onReady, onFailed }: Props,
  ref: ForwardedRef<HeyGenAvatarHandle>,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  // Keep callbacks in refs so the effect doesn't re-run on prop change.
  const onReadyRef = useRef(onReady);
  const onFailedRef = useRef(onFailed);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    onFailedRef.current = onFailed;
  }, [onFailed]);

  useImperativeHandle(
    ref,
    () => ({
      say: async (text: string) => {
        const session = sessionRef.current;
        if (!session) throw new Error('avatar not ready');
        return new Promise<void>((resolve, reject) => {
          let settled = false;
          const cleanup = () => {
            session.off(AgentEventsEnum.AVATAR_SPEAK_ENDED, onEnded);
            clearTimeout(timer);
          };
          const onEnded = () => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve();
          };
          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error('avatar speak timeout'));
          }, SPEAK_TIMEOUT_MS);

          session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, onEnded);
          try {
            session.repeat(text);
          } catch (err) {
            if (settled) return;
            settled = true;
            cleanup();
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        });
      },
      interrupt: () => {
        try {
          sessionRef.current?.interrupt();
        } catch (err) {
          console.warn('[heygen] interrupt failed:', err);
        }
      },
    }),
    [],
  );

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    let cancelled = false;
    setStatus('connecting');

    const setup = async () => {
      const res = await fetch('/api/avatar/session', { method: 'POST' });
      if (!res.ok) throw new Error(`session: ${res.status}`);
      const sessionInfo = (await res.json()) as HeyGenSessionResponse;
      if (cancelled) return;

      const session = new LiveAvatarSession(sessionInfo.sessionToken, {
        voiceChat: false,
      });

      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        if (cancelled) return;
        try {
          session.attach(videoEl);
        } catch (err) {
          console.warn('[heygen] attach failed:', err);
        }
        setStatus('ready');
        onReadyRef.current?.();
      });

      session.on(SessionEvent.SESSION_DISCONNECTED, (reason) => {
        console.warn('[heygen] disconnected:', reason);
        if (cancelled) return;
        setStatus('failed');
        onFailedRef.current?.();
      });

      sessionRef.current = session;
      await session.start();
    };

    setup().catch((err) => {
      console.warn('[heygen] setup failed:', err);
      if (cancelled) return;
      setStatus('failed');
      onFailedRef.current?.();
    });

    return () => {
      cancelled = true;
      void sessionRef.current?.stop().catch(() => undefined);
      sessionRef.current = null;
    };
  }, []);

  if (status === 'failed') return null;

  return (
    <div className={className}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full bg-ink object-cover"
        aria-label="AI tutor avatar"
      />
    </div>
  );
}

export const HeyGenAvatar = forwardRef<HeyGenAvatarHandle, Props>(HeyGenAvatarImpl);
HeyGenAvatar.displayName = 'HeyGenAvatar';
