"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { toneForGrade } from "@/constants/categories";
import type { LastSale } from "@/hooks/useAuctionState";

const CONFETTI_COLORS = [
  "var(--accent)",
  "var(--accent-hover)",
  "var(--success)",
  "var(--info)",
  "var(--warning)",
  "#FFFFFF",
];
const SHOW_MS = 5000;

/**
 * Full-screen SOLD moment. Fires when a NEW sale appears after the page has
 * loaded (the sale already present on first load is ignored). Click to dismiss.
 */
export function SoldCelebration({ lastSale }: { lastSale: LastSale | null | undefined }) {
  const seenRef = useRef<string | null | undefined>(undefined); // undefined = first render
  const [active, setActive] = useState<LastSale | null>(null);

  useEffect(() => {
    if (seenRef.current === undefined) {
      seenRef.current = lastSale?.id ?? null;
      return;
    }
    if (lastSale && lastSale.id !== seenRef.current) {
      seenRef.current = lastSale.id;
      setActive(lastSale);
    }
  }, [lastSale]);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [active]);

  // Deterministic spread (no randomness → stable across renders)
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: ((i * 13) % 22) / 10,
        duration: 2.6 + ((i * 17) % 16) / 10,
        size: 6 + ((i * 7) % 7),
        drift: ((i * 29) % 120) - 60,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    []
  );

  if (!active) return null;

  const assigned = active.acquired_via === "MANUAL_ALLOT";

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => setActive(null)}
      className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm animate-fade-in cursor-pointer p-6"
    >
      <div className="confetti-layer" aria-hidden>
        {pieces.map((p, i) => (
          <span
            key={`${active.id}-${i}`}
            className="confetti-piece"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.6,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              ["--drift" as string]: `${p.drift}px`,
            }}
          />
        ))}
      </div>

      <div className="relative animate-sold-in text-center rounded-2xl border border-[var(--accent-line)] bg-[var(--bg-1)] px-8 py-8 md:px-14 md:py-10 max-w-md w-full shadow-[0_0_80px_rgba(228,183,92,0.18)]">
        {active.image_url ? (
          <img
            src={active.image_url}
            alt=""
            className="h-24 w-24 md:h-28 md:w-28 rounded-full object-cover mx-auto border-2 border-[var(--accent-line)]"
          />
        ) : (
          <div className="h-24 w-24 rounded-full bg-[var(--bg-2)] mx-auto border-2 border-[var(--accent-line)]" />
        )}

        <div className="text-[12px] uppercase tracking-[0.35em] text-[var(--accent)] mt-6">
          {assigned ? "Captain assigned" : "Sold"}
        </div>

        <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.02em] leading-tight mt-2">
          {active.player_name}
        </h2>

        {active.grade && (
          <div className="mt-2">
            <Badge tone={toneForGrade(active.grade)}>{active.grade}</Badge>
          </div>
        )}

        <div className="text-[13px] text-[var(--fg-3)] mt-5">to</div>
        <div className="text-[26px] md:text-[30px] font-semibold text-[var(--accent)] leading-tight">
          {active.team_name}
        </div>

        <div className="text-[34px] md:text-[40px] font-semibold tnum mt-3">
          {formatINR(active.price, { compact: true })}
        </div>
      </div>
    </div>
  );
}
