"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_ORDER,
  DEFAULT_BASE_PRICES,
  PLAYERS_PER_CATEGORY,
  type Category,
} from "@/constants/categories";
import { formatINR, cn } from "@/lib/utils";

export function CategoryPicker({
  counts,
  disabled,
  onDraw,
}: {
  counts: Record<string, number>;
  disabled: boolean;
  onDraw: (category: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const total = CATEGORY_ORDER.reduce((sum, cat) => sum + (counts[cat] ?? 0), 0);
  // Shared with the API: always finish the first nonempty grade before
  // moving ahead. When Round 2 starts, this automatically returns to A+.
  const activeGrade = CATEGORY_ORDER.find((cat) => (counts[cat] ?? 0) > 0) ?? null;

  async function draw() {
    if (!activeGrade || disabled || busy) return;
    setBusy(true);
    try {
      await onDraw(activeGrade);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--line-1)] bg-[var(--bg-1)] p-5">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h3 className="text-[15px] font-medium text-[var(--fg-1)]">
            Sequential category draw
          </h3>
          <p className="text-[12px] text-[var(--fg-3)] mt-1">
            A+ → A1 → A2 → A3 → B1 → … → G1. Unsold players are immediately drawn again in the same category. Only the Main Controller may skip a player after a retry. Advance only after every player is sold or explicitly skipped.
          </p>
          {activeGrade && (
            <p className="mt-2 text-[12px] font-semibold text-[var(--accent)]" aria-live="polite">
              Current category: {activeGrade} · {counts[activeGrade]} remaining
            </p>
          )}
        </div>
        <Button variant="primary" size="sm" onClick={draw}
          loading={busy} disabled={disabled || activeGrade === null || busy}>
          {activeGrade ? `Draw next ${activeGrade}` : "Round complete"}
          {total > 0 && <span className="opacity-65">({total} total)</span>}
        </Button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {CATEGORY_ORDER.map((cat, i) => {
          const remaining = counts[cat] ?? 0;
          const isActive = cat === activeGrade;
          return (
            <div key={cat}
              aria-current={isActive ? "step" : undefined}
              style={{ animationDelay: `${i * 22}ms` }}
              className={cn(
                "rounded-lg border p-3 text-left animate-fade-up transition-[border-color,background-color] duration-150",
                isActive
                  ? "border-[var(--accent-line)] bg-[var(--accent-bg)]"
                  : "border-[var(--line-1)] bg-[var(--bg-0)]",
                remaining === 0 && "opacity-50"
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={cn("text-[13px] font-medium", isActive ? "text-[var(--accent)]" : "text-[var(--fg-1)]")}>
                  {cat}
                </span>
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-label="Current category" />}
              </div>
              <div className="text-[11px] text-[var(--fg-4)] mt-1.5 tnum">
                {remaining}/{PLAYERS_PER_CATEGORY}
              </div>
              <div className="text-[11px] text-[var(--fg-3)] mt-0.5 tnum">
                {formatINR(DEFAULT_BASE_PRICES[cat as Category], { compact: true })}
              </div>
            </div>
          );
        })}
      </div>
      {activeGrade === null && (
        <p className="text-[12px] text-[var(--fg-3)] mt-4">
          All ordinary players are sold or explicitly skipped. The controller can proceed to Final allotment; the old separate Round 2 is not needed.
        </p>
      )}
    </div>
  );
}
