"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_ORDER,
  DEFAULT_BASE_PRICES,
  PLAYERS_PER_CATEGORY,
  type Category,
} from "@/constants/categories";
import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function CategoryPicker({
  counts,
  disabled,
  onDraw,
}: {
  counts: Record<string, number>;
  disabled: boolean;
  onDraw: (category: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  async function draw(cat: string) {
    setBusy(cat);
    await onDraw(cat);
    setBusy(null);
  }

  return (
    <div className="rounded-xl border border-[var(--line-1)] bg-[var(--bg-1)] p-5">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h3 className="text-[15px] font-medium text-[var(--fg-1)]">
            Draw next player
          </h3>
          <p className="text-[12px] text-[var(--fg-3)] mt-1">
            Pick a category. System draws a random unsold player.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => draw("ANY")}
          loading={busy === "ANY"}
          disabled={disabled || total === 0 || busy !== null}
        >
          Draw any ({total})
        </Button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {CATEGORY_ORDER.map((cat, i) => {
          const remaining = counts[cat] ?? 0;
          const empty = remaining === 0;
          const isBusy = busy === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => draw(cat)}
              disabled={disabled || empty || busy !== null}
              style={{ animationDelay: `${i * 22}ms` }}
              className={cn(
                "group rounded-lg border border-[var(--line-1)] bg-[var(--bg-0)] p-3 text-left animate-fade-up",
                "transition-[border-color,background-color,transform] duration-150",
                "hover:-translate-y-0.5 active:scale-[0.97]",
                "hover:border-[var(--accent-line)] hover:bg-[var(--bg-2)]",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[var(--line-1)] disabled:hover:bg-[var(--bg-0)]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[var(--fg-1)]">
                  {cat}
                </span>
                {isBusy && (
                  <span className="h-3 w-3 rounded-full border-[1.5px] border-[var(--accent)] border-t-transparent animate-spin-slow" />
                )}
              </div>
              <div className="text-[11px] text-[var(--fg-4)] mt-1.5 tnum">
                {remaining}/{PLAYERS_PER_CATEGORY}
              </div>
              <div className="text-[11px] text-[var(--fg-3)] mt-0.5 tnum">
                {formatINR(DEFAULT_BASE_PRICES[cat as Category], { compact: true })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}