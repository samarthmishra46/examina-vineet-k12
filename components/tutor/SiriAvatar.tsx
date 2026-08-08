'use client';

// Illustrated persona for "Aryan Sir" — a simple, original flat-vector portrait
// (not a photo, not any real/likeness) used wherever a HeyGen video avatar
// isn't connected. Keeps the original pulse-ring / sound-wave speaking cues.
function AryanSirPortrait() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
      <defs>
        <clipPath id="aryan-face-clip">
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>
      <g clipPath="url(#aryan-face-clip)">
        {/* Background */}
        <circle cx="50" cy="50" r="48" fill="#EDE4D3" />
        {/* Shirt / collar */}
        <path d="M14 100 Q50 74 86 100 L86 108 L14 108 Z" fill="#2F5D8C" />
        <path d="M40 78 L50 92 L44 82 Z" fill="#F4F1EA" />
        <path d="M60 78 L50 92 L56 82 Z" fill="#F4F1EA" />
        {/* Neck */}
        <rect x="42" y="66" width="16" height="16" rx="6" fill="#C68A5D" />
        {/* Head */}
        <ellipse cx="50" cy="48" rx="21" ry="23" fill="#D89B6C" />
        {/* Ears */}
        <ellipse cx="28.5" cy="49" rx="3.2" ry="4.5" fill="#D89B6C" />
        <ellipse cx="71.5" cy="49" rx="3.2" ry="4.5" fill="#D89B6C" />
        {/* Hair */}
        <path
          d="M29 44 Q26 20 50 18 Q74 20 71 44 Q71 30 50 30 Q29 30 29 44 Z"
          fill="#26201B"
        />
        <path d="M29 44 Q27 34 33 27 Q30 36 31 46 Z" fill="#26201B" />
        <path d="M71 44 Q73 34 67 27 Q70 36 69 46 Z" fill="#26201B" />
        {/* Eyebrows */}
        <rect x="38" y="43" width="9" height="2.3" rx="1.1" fill="#26201B" />
        <rect x="53" y="43" width="9" height="2.3" rx="1.1" fill="#26201B" />
        {/* Eyes */}
        <ellipse cx="42.5" cy="49" rx="2.4" ry="2.7" fill="#26201B" />
        <ellipse cx="57.5" cy="49" rx="2.4" ry="2.7" fill="#26201B" />
        {/* Nose */}
        <path d="M50 47 Q52.5 54 50 57 Q47.5 57 48 55" stroke="#B47D4F" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {/* Mustache */}
        <path d="M42 60 Q50 63 58 60 Q50 61.5 42 60 Z" fill="#26201B" />
        {/* Smile */}
        <path d="M43 63 Q50 68 57 63" stroke="#7A4A2B" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function SiriAvatar({ speaking, className }: { speaking: boolean; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className ?? ''}`}>
      <div className="relative flex h-full w-full items-center justify-center">
        {/* Expanding pulse rings — only when speaking */}
        {speaking && (
          <>
            <div
              className="absolute h-[140%] w-[140%] rounded-full bg-accent/10 animate-ping"
              style={{ animationDuration: '1.8s' }}
            />
            <div
              className="absolute h-[120%] w-[120%] rounded-full bg-accent/15 animate-ping"
              style={{ animationDuration: '1.8s', animationDelay: '0.35s' }}
            />
          </>
        )}

        {/* Portrait */}
        <div
          className={`relative z-10 h-full w-full overflow-hidden rounded-full ring-2 shadow-xl transition-all duration-300
            ${speaking ? 'scale-105 ring-accent shadow-accent/60' : 'scale-100 ring-white/40 shadow-accent/20'}`}
        >
          <AryanSirPortrait />
        </div>

        {/* Sound wave bars below portrait — when speaking */}
        {speaking && (
          <div className="absolute -bottom-6 flex items-end justify-center gap-0.5">
            {[3, 5, 8, 11, 14, 11, 8, 5, 3].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-accent/70 animate-bounce"
                style={{
                  height: `${h * 1.4}px`,
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
