"use client";

import { useState } from "react";
import { useAuctionState } from "@/hooks/useAuctionState";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { SoldCelebration } from "@/components/auction/SoldCelebration";
import { CategoryPicker } from "@/components/auction/CategoryPicker";
import { getBasePrice } from "@/constants/categories";
import {
  Pause,
  Play,
  RotateCcw,
  Check,
  Undo2,
  X,
} from "lucide-react";

export function ConsoleClient({ auctionId }: { auctionId: string }) {
  const { state, loading, refresh } = useAuctionState(auctionId, 1500);
  const [busy, setBusy] = useState<
    null | "unsold" | "sell" | "undo" | "pause" | "resume" | "round2" | "assign"
  >(null);
  const [err, setErr] = useState<string | null>(null);

  if (loading || !state) {
    return <div className="text-[13px] text-[var(--fg-3)]">Loading auction…</div>;
  }

  const { auction, current, highestBid, counts, teams } = state;
  const isLive = auction?.status === "LIVE";
  const isPaused = auction?.status === "PAUSED";
  const hasCurrent = !!current;
  const basePrice = current?.player?.grade
  ? getBasePrice(auction?.config, current.player.grade)
  : 0;
  const currentBid = highestBid?.amount ?? 0;

  // A playing captain is never bid on — the auctioneer assigns them.
  const captainTeam = current?.captainTeam ?? null;
  const isCaptain = !!captainTeam;

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
    <div className="space-y-6 max-w-6xl animate-fade-up">
      <SoldCelebration lastSale={state.lastSale} />
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Auction Console
          </h1>
          <p className="text-[13px] text-[var(--fg-3)] mt-1">
            {auction?.name} ·{" "}
            <span
              className={
                isLive
                  ? "text-[var(--success)]"
                  : isPaused
                  ? "text-[var(--warning)]"
                  : "text-[var(--fg-3)]"
              }
            >
              {auction?.status}
            </span>{" "}
            · <span className="text-[var(--fg-4)]">{auction?.mode}</span>
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
              <Pause size={13} strokeWidth={2} />
              Pause
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
              <Play size={13} strokeWidth={2} />
              Resume
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              call(
                "round2",
                "round2",
                "Re-queue all unsold players?\n\nThey'll become available for a second round."
              )
            }
            loading={busy === "round2"}
            disabled={busy !== null}
          >
            <RotateCcw size={13} strokeWidth={2} />
            Round 2
          </Button>
        </div>
      </header>

      {!isLive && !isPaused && (
        <Card className="border-[var(--warning-line)] bg-[var(--warning-bg)]">
          <CardBody className="text-[13px] text-[var(--warning)] p-4">
            Auction is not live. Start it from Auction Control.
          </CardBody>
        </Card>
      )}

      {isPaused && (
        <Card className="border-[var(--warning-line)] bg-[var(--warning-bg)]">
          <CardBody className="text-[13px] text-[var(--warning)] p-4">
            Auction is paused. Resume to continue.
          </CardBody>
        </Card>
      )}

      {err && (
        <div className="text-[13px] rounded-lg p-3 border border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger)] animate-fade-down">
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
            teams={teams.map((t) => ({ id: t.id, name: t.name }))}
          />

          {isCaptain && captainTeam && (
            <div className="rounded-lg border border-[var(--accent-line)] bg-[var(--bg-1)] p-4 animate-scale-in">
              <div className="text-[13px] font-medium text-[var(--accent)]">
                Playing captain of {captainTeam.name}
              </div>
              <p className="text-[12px] text-[var(--fg-3)] mt-1">
                Bidding is disabled. Assigning deducts the average price of the
                other sold {current?.player?.grade} players from{" "}
                {captainTeam.name}&apos;s purse.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {isCaptain && captainTeam ? (
              <Button
                onClick={() =>
                  call(
                    "assign-captain",
                    "assign",
                    `Assign ${current?.player?.name} to ${captainTeam.name}?\n\nThe average price of the other sold ${current?.player?.grade} players will be deducted from ${captainTeam.name}'s purse.`
                  )
                }
                loading={busy === "assign"}
                disabled={busy !== null || !isLive}
              >
                <Check size={14} strokeWidth={2} />
                Assign to {captainTeam.name}
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => call("sell", "sell")}
                  loading={busy === "sell"}
                  disabled={busy !== null || !highestBid || !isLive}
                >
                  <Check size={14} strokeWidth={2} />
                  Sell to{" "}
                  {teams.find((t) => t.id === highestBid?.team_id)?.name ?? "…"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => call("undo-bid", "undo")}
                  loading={busy === "undo"}
                  disabled={busy !== null || !highestBid}
                >
                  <Undo2 size={14} strokeWidth={2} />
                  Undo last bid
                </Button>
              </>
            )}
            <Button
              variant="danger"
              onClick={() => call("unsold", "unsold")}
              loading={busy === "unsold"}
              disabled={busy !== null || !isLive}
            >
              <X size={14} strokeWidth={2} />
              Mark unsold
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <CardBody className="text-[13px] text-[var(--fg-3)] py-16 text-center">
            {isLive
              ? "No player on the block. Pick a category below to draw one."
              : isPaused
              ? "Auction is paused."
              : "Waiting for auction to start."}
          </CardBody>
        </Card>
      )}

      {isLive && (
        <CategoryPicker
          counts={counts}
          disabled={hasCurrent}
          onDraw={drawNext}
        />
      )}
    </div>
  );
}