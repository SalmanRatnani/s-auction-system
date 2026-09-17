"use client";

import { useEffect, useState } from "react";

export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 1600);
    const t2 = setTimeout(() => onDone?.(), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-court transition-opacity duration-500 ${
        exiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="text-center space-y-6 animate-slide-up">
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="h-32 w-32 grid place-items-center animate-shuttle">
              <svg viewBox="0 0 64 64" className="h-20 w-20 drop-shadow-[0_0_30px_rgba(52,211,153,0.6)]">
                <defs>
                  <linearGradient id="splash-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                <path
                  d="M32 4 L20 26 M32 4 L32 26 M32 4 L44 26"
                  stroke="url(#splash-grad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="32" cy="46" r="9" fill="url(#splash-grad)" />
                <circle cx="30" cy="44" r="2.5" fill="rgba(255,255,255,0.4)" />
              </svg>
            </div>
            <span className="absolute inset-0 rounded-full border-2 border-emerald-400/30 animate-pulse-ring" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-black tracking-tight">
            S Auction <span className="text-gradient">System</span>
          </h1>
          <p className="text-white/40 text-sm tracking-widest uppercase">
            Badminton Player Auction
          </p>
        </div>
      </div>
    </div>
  );
}