"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_ORDER,
  CATEGORY_COLORS,
  DEFAULT_BASE_PRICES,
  PLAYERS_PER_CATEGORY,
  type Category,
} from "@/constants/categories";
import { formatINR } from "@/lib/utils";

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
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold">Draw next player</h3>
          <p className="text-xs text-white/50 mt-0.5">
            Pick a category. System draws a random unsold player from that pool.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => draw("ANY")}
          loading={busy === "ANY"}
          disabled={disabled || total === 0 || busy !== null}
        >
          🎲 Any ({total})
        </Button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {CATEGORY_ORDER.map((cat) => {
          const remaining = counts[cat] ?? 0;
          const empty = remaining === 0;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => draw(cat)}
              disabled={disabled || empty || busy !== null}
              className={`rounded-lg border px-2 py-2 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:border-emerald-400/60 ${
                CATEGORY_COLORS[cat as Category]
              }`}
            >
              <div className="font-bold text-sm">{cat}</div>
              <div className="text-[10px] opacity-70">
                {remaining}/{PLAYERS_PER_CATEGORY} · {formatINR(DEFAULT_BASE_PRICES[cat as Category], { compact: true })}
              </div>
              {busy === cat && <div className="text-[10px] mt-0.5">Drawing…</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}