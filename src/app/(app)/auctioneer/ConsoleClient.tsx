"use client";

import { useState } from "react";
import { useAuctionState } from "@/hooks/useAuctionState";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { CategoryPicker } from "@/components/auction/CategoryPicker";
import { DEFAULT_BASE_PRICES, type Category } from "@/constants/categories";

export function ConsoleClient({ auctionId }: { auctionId: string }) {
  const { state, loading, refresh } = useAuctionState(auctionId);
  const [busy, setBusy] = useState<null | "unsold" | "sell" | "undo">(null);
  const [err, setErr] = useState<string | null>(null);

  if (loading || !state) return <div className="text-white/50">Loading auction…</div>;

  const { auction, current, highestBid, counts, teams } = state;
  const isLive = auction?.status === "LIVE";
  const hasCurrent = !!current;
  const basePrice =
    current?.player?.grade != null
      ? DEFAULT_BASE_PRICES[current.player.grade as Category] ?? 0
      : 0;
  const currentBid = highestBid?.amount ?? 0;

  async function call(endpoint: string, label: string) {
    setBusy(label as typeof busy);
    setErr(null);
    const res = await fetch(`/api/auction/${auctionId}/${endpoint}`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setErr(body.error ?? "Failed");
      return;
    }
    refresh();
  }

  async function drawNext(category: string) {
    setErr(null);
    const res = await fetch(`/api/auction/${auctionId}/next-player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(body.error ?? "Draw failed");
      return;
    }
    refresh();
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Auctioneer Console</h1>
          <p className="text-white/50 text-sm mt-1">
            {auction?.name} ·{" "}
            <span className={isLive ? "text-emerald-300" : "text-amber-300"}>
              {auction?.status}
            </span>{" "}
            · <span className="text-white/40">{auction?.mode}</span>
          </p>
        </div>
      </header>

      {!isLive && (
        <Card className="border-amber-500/30">
          <CardBody className="text-sm text-amber-300">
            Auction is not LIVE. Start it from <strong>Auction Control</strong>.
          </CardBody>
        </Card>
      )}

      {err && (
        <div className="text-sm rounded-lg p-3 border bg-red-500/10 border-red-500/30 text-red-300">
          {err}
        </div>
      )}

      {hasCurrent && current?.player ? (
        <div className="space-y-4">
          <PlayerOnBlock
            player={current.player}
            highestBid={highestBid}
            basePrice={basePrice}
            currentBid={currentBid}
            teams={teams}
          />

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => call("sell", "sell")}
              loading={busy === "sell"}
              disabled={busy !== null || !highestBid}
            >
              ✅ Sell to {teams.find((t) => t.id === highestBid?.team_id)?.name ?? "…"}
            </Button>
            <Button
              variant="outline"
              onClick={() => call("undo-bid", "undo")}
              loading={busy === "undo"}
              disabled={busy !== null || !highestBid}
            >
              ↶ Undo last bid
            </Button>
            <Button
              variant="danger"
              onClick={() => call("unsold", "unsold")}
              loading={busy === "unsold"}
              disabled={busy !== null}
            >
              Mark unsold
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <CardBody className="text-white/50 text-sm py-12 text-center">
            {isLive
              ? "No player on the block. Pick a category below to draw one."
              : "Waiting for auction to start."}
          </CardBody>
        </Card>
      )}

      {isLive && (
        <CategoryPicker counts={counts} disabled={hasCurrent} onDraw={drawNext} />
      )}
    </div>
  );
}