'use client';

export function SiriAvatar({ speaking, className }: { speaking: boolean; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className ?? ''}`}>
      <div className="relative flex items-center justify-center">
        {/* Expanding pulse rings — only when speaking */}
        {speaking && (
          <>
            <div
              className="absolute h-40 w-40 rounded-full bg-accent/10 animate-ping"
              style={{ animationDuration: '1.8s' }}
            />
            <div
              className="absolute h-28 w-28 rounded-full bg-accent/15 animate-ping"
              style={{ animationDuration: '1.8s', animationDelay: '0.35s' }}
            />
            <div
              className="absolute h-20 w-20 rounded-full bg-accent/20 animate-ping"
              style={{ animationDuration: '1.8s', animationDelay: '0.7s' }}
            />
          </>
        )}

        {/* Core orb */}
        <div
          className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full
            bg-gradient-to-br from-blue-400 via-accent to-violet-500
            shadow-xl transition-all duration-300
            ${speaking ? 'scale-110 shadow-accent/60 animate-pulse' : 'scale-100 shadow-accent/20'}`}
        >
          {/* Inner highlight */}
          <div className="absolute inset-2 rounded-full bg-white/25 blur-sm" />
          {/* Microphone icon when idle */}
          {!speaking && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="relative z-10 text-white/70"
              aria-hidden
            >
              <path
                d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"
                fill="currentColor"
              />
              <path
                d="M19 10a7 7 0 0 1-14 0M12 19v3M9 22h6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        {/* Sound wave bars below orb — when speaking */}
        {speaking && (
          <div className="absolute -bottom-9 flex items-end justify-center gap-0.5">
            {[3, 5, 8, 11, 14, 11, 8, 5, 3].map((h, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-accent/70 animate-bounce"
                style={{
                  height: `${h * 2}px`,
                  animationDelay: `${i * 0.08}s`,
                  animationDuration: '0.7s',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
