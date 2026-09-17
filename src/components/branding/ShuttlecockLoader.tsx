export function ShuttlecockLoader({
  label = "Loading",
  fullScreen = false,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 ${
        fullScreen ? "min-h-screen" : "min-h-[60vh]"
      }`}
    >
      <div className="relative">
        {/* Outer pulse rings */}
        <span className="absolute inset-0 rounded-full border border-emerald-400/30 animate-pulse-ring" />
        <span
          className="absolute inset-0 rounded-full border border-emerald-400/20 animate-pulse-ring"
          style={{ animationDelay: "600ms" }}
        />

        {/* Shuttlecock */}
        <div className="relative h-24 w-24 grid place-items-center animate-shuttle">
          <svg viewBox="0 0 64 64" className="h-16 w-16 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]">
            <defs>
              <linearGradient id="shuttle-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            {/* Feathers */}
            <path
              d="M32 4 L20 26 M32 4 L32 26 M32 4 L44 26"
              stroke="url(#shuttle-grad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />
            <path
              d="M22 22 Q32 8 42 22"
              stroke="url(#shuttle-grad)"
              strokeWidth="1.5"
              fill="none"
              opacity="0.5"
            />
            {/* Cork base */}
            <circle cx="32" cy="46" r="9" fill="url(#shuttle-grad)" />
            <circle cx="32" cy="46" r="9" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.75" />
            <circle cx="30" cy="44" r="2.5" fill="rgba(255,255,255,0.4)" />
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-sm text-white/60 font-medium">{label}</span>
        <span className="flex gap-0.5">
          <span className="h-1 w-1 rounded-full bg-emerald-400 animate-bounce" />
          <span
            className="h-1 w-1 rounded-full bg-emerald-400 animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-1 w-1 rounded-full bg-emerald-400 animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </span>
      </div>
    </div>
  );
}