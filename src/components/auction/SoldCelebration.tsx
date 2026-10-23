"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
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
 * Non-modal SOLD moment. New sales celebrate without blocking bidding controls
 * or moving keyboard focus. The sale already present on first load is ignored.
 */
export function SoldCelebration({
  lastSale,
}: {
  lastSale: LastSale | null | undefined;
}) {
  const seenRef = useRef<string | null | undefined>(undefined); // undefined = first render
  const [active, setActive] = useState<LastSale | null>(null);
  const [engaged, setEngaged] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const dismiss = useCallback(() => {
    if (
      card.current?.contains(document.activeElement) &&
      returnFocus.current?.isConnected
    )
      returnFocus.current.focus();
    setActive(null);
  }, []);

  useEffect(() => {
    if (seenRef.current === undefined) {
      seenRef.current = lastSale?.id ?? null;
      return;
    }
    if (lastSale && lastSale.id !== seenRef.current) {
      seenRef.current = lastSale.id;
      setEngaged(false);
      setActive(lastSale);
    }
  }, [lastSale]);

  useEffect(() => {
    if (!active) return;
    // Once someone interacts, leave dismissal in their control.
    const t = engaged ? null : setTimeout(dismiss, SHOW_MS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      if (t !== null) clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [active, engaged, dismiss]);

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
    [],
  );

  const assigned = active?.acquired_via === "MANUAL_ALLOT";

  return (
    <>
      <span className="sr-only" role="status" aria-atomic="true">
        {active
          ? `${assigned ? "Captain assigned" : "Sold"}: ${active.player_name} to ${active.team_name} for ${formatINR(active.price)} in virtual auction credits.`
          : ""}
      </span>
      {active &&
        createPortal(
          <div className="sale-celebration" key={active.id}>
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

            <div
              ref={card}
              className="sale-moment animate-sold-in"
              onPointerEnter={() => setEngaged(true)}
              onFocusCapture={(event) => {
                setEngaged(true);
                if (!event.currentTarget.contains(event.relatedTarget))
                  returnFocus.current =
                    event.relatedTarget instanceof HTMLElement
                      ? event.relatedTarget
                      : null;
              }}
            >
              <button
                type="button"
                className="sale-dismiss"
                aria-label="Dismiss sale celebration"
                onClick={dismiss}
              >
                <X size={18} />
              </button>
              <div>
                {active.image_url ? (
                  <img
                    src={active.image_url}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover mx-auto border-2 border-[var(--accent-line)]"
                  />
                ) : (
                  <div aria-hidden="true" className="sale-monogram">
                    {active.player_name
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((word) => word[0])
                      .join("")}
                  </div>
                )}

                <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--accent)] mt-4">
                  {assigned ? "Captain assigned" : "Sold"}
                </div>

                <h2 className="text-2xl font-semibold tracking-tight leading-tight mt-2 break-words">
                  {active.player_name}
                </h2>

                {active.grade && (
                  <div className="mt-2">
                    <Badge tone={toneForGrade(active.grade)}>
                      {active.grade}
                    </Badge>
                  </div>
                )}

                <div className="text-[11px] text-[var(--fg-3)] mt-3">to</div>
                <div className="text-xl font-semibold text-[var(--accent)] leading-tight break-words">
                  {active.team_name}
                </div>

                <div className="text-3xl font-semibold tnum mt-3">
                  {formatINR(active.price, { compact: true })}
                </div>
                <p className="text-[10px] text-[var(--fg-3)] mt-1">
                  Virtual auction credits
                </p>
              </div>
              {!engaged && <span className="sale-timer" aria-hidden="true" />}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
