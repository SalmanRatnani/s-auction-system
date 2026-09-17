"use client";

import { useState } from "react";
import { useAuctionState } from "@/hooks/useAuctionState";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { CategoryPicker } from "@/components/auction/CategoryPicker";
import { DEFAULT_BASE_PRICES, type Category } from "@/constants/categories";

export function ConsoleClient({ auctionId }: { auctionId: string }) {
  const { state, loading, refresh } = useAuctionState(auctionId, 1500);
  const [busy, setBusy] = useState<
    null | "unsold" | "sell" | "undo" | "pause" | "resume" | "round2"
  >(null);
  const [err, setErr] = useState<string | null>(null);

  if (loading || !state)
    return <div className="text-white/50">Loading auction…</div>;

  const { auction, current, highestBid, counts, teams } = state;
  const isLive = auction?.status === "LIVE";
  const isPaused = auction?.status === "PAUSED";
  const hasCurrent = !!current;

  const basePrice =
    current?.player?.grade != null
      ? DEFAULT_BASE_PRICES[current.player.grade as Category] ?? 0
      : 0;
  const currentBid = highestBid?.amount ?? 0;

  async function call(endpoint: string, label: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(label as typeof busy);
    setErr(null);
    const res = await fetch(`/api/auction/${auctionId}/${endpoint}`, {
      method: "POST",
    });
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
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Auctioneer Console</h1>
          <p className="text-white/50 text-sm mt-1">
            {auction?.name} ·{" "}
            <span
              className={
                isLive
                  ? "text-emerald-300"
                  : isPaused
                  ? "text-amber-300"
                  : "text-white/70"
              }
            >
              {auction?.status}
            </span>{" "}
            · <span className="text-white/40">{auction?.mode}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isLive && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => call("pause", "pause")}
              loading={busy === "pause"}
              disabled={busy !== null}
            >
              ⏸ Pause
            </Button>
          )}
          {isPaused && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => call("resume", "resume")}
              loading={busy === "resume"}
              disabled={busy !== null}
            >
              ▶ Resume
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              call(
                "round2",
                "round2",
                "Re-queue all unsold players?\n\nThey'll become available for a second round of bidding."
              )
            }
            loading={busy === "round2"}
            disabled={busy !== null}
          >
            🔄 Round 2
          </Button>
        </div>
      </header>

      {!isLive && !isPaused && (
        <Card className="border-amber-500/30">
          <CardBody className="text-sm text-amber-300">
            Auction is not LIVE. Start it from <strong>Auction Control</strong>.
          </CardBody>
        </Card>
      )}

      {isPaused && (
        <Card className="border-amber-500/40">
          <CardBody className="text-sm text-amber-300">
            ⏸ Auction is PAUSED. Resume to continue drawing and selling.
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
              disabled={busy !== null || !highestBid || !isLive}
            >
              ✅ Sell to{" "}
              {teams.find((t) => t.id === highestBid?.team_id)?.name ?? "…"}
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
              disabled={busy !== null || !isLive}
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
              : isPaused
              ? "Auction is paused."
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