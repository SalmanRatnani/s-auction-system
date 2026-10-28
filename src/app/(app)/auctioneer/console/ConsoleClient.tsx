"use client";

import { sendAction, type PendingAction } from "@/lib/action-request";
import { formatINR } from "@/lib/utils";
import { useRef, useState } from "react";
import { useAuctionState } from "@/hooks/useAuctionState";
import { AuctionConnection } from "@/components/auction/AuctionConnection";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { SoldCelebration } from "@/components/auction/SoldCelebration";
import { CategoryPicker } from "@/components/auction/CategoryPicker";
import { getBasePrice } from "@/constants/categories";
import { Pause, Play, Check, Undo2, X } from "lucide-react";

type ConsoleAction =
  | "unsold"
  | "skip"
  | "sell"
  | "undo"
  | "pause"
  | "resume"
  | "draw";

export function ConsoleClient({
  auctionId,
  canSkip,
}: {
  auctionId: string;
  canSkip: boolean;
}) {
  const { state, loading, error, refresh, realtimeConnected, stale } =
    useAuctionState(auctionId, 1500);
  const inFlight = useRef(false);
  const pending = useRef<PendingAction | null>(null);
  const [hasPending, setHasPending] = useState(false);
  const [busy, setBusy] = useState<
    null | "unsold" | "skip" | "sell" | "undo" | "pause" | "resume" | "draw"
  >(null);
  const [err, setErr] = useState<string | null>(null);

  if (loading || !state) {
    return (
      <AuctionConnection
        loading={loading}
        error={error}
        onRetry={() => void refresh()}
      />
    );
  }

  const { auction, current, highestBid, counts, teams } = state;
  const isLive = auction?.status === "LIVE";
  const isPaused = auction?.status === "PAUSED";
  const hasCurrent = !!current;
  const basePrice = current?.player?.grade
    ? getBasePrice(auction?.config, current.player.grade)
    : 0;
  const currentBid = highestBid?.amount ?? 0;
  const isRetry = (current?.round ?? 1) > 1;
  const isLegacyRoundTwo = !!(
    auction as { round_two_started_at?: string | null }
  )?.round_two_started_at;

  // A playing captain is never bid on — the auctioneer assigns them.
  const captainTeam = current?.captainTeam ?? null;
  const isCaptain = !!captainTeam;

  async function call(
    endpoint: string,
    label: ConsoleAction,
    confirmMsg?: string,
    payload?: object,
  ) {
    if (
      (stale && !pending.current) ||
      inFlight.current ||
      (confirmMsg && !window.confirm(confirmMsg))
    )
      return;
    inFlight.current = true;
    setBusy(label);
    setErr(null);
    try {
      const { response: res, body } = await sendAction(
        `/api/auction/${auctionId}/${endpoint}`,
        {
          ...payload,
          expectedVersion: auction?.state_version,
          expectedPlayerId: current?.id ?? null,
          expectedBidId: highestBid?.id ?? null,
        },
        pending,
      );
      if (!res.ok) {
        setErr(body.error ?? "The action could not be completed.");
        void refresh();
        return;
      }
      void refresh();
    } catch {
      setErr(
        "Connection interrupted. Check the auction state before repeating the action.",
      );
      void refresh();
    } finally {
      inFlight.current = false;
      setHasPending(pending.current !== null);
      setBusy(null);
    }
  }
  async function drawNext(category: string) {
    await call("next-player", "draw", undefined, { category });
  }

  return (
    <div className="space-y-6 max-w-6xl animate-fade-up">
      <SoldCelebration lastSale={state.lastSale} />
      {hasPending && !busy && (
        <div
          role="alert"
          className="rounded-lg border border-[var(--warning-line)] p-3 text-sm"
        >
          An action is awaiting confirmation. Retrieve its result before
          continuing.
          <Button
            variant="outline"
            size="sm"
            className="ml-3"
            onClick={() => {
              const endpoint = pending.current!.url.split("/").pop()!;
              const labels: Record<string, ConsoleAction> = {
                "next-player": "draw",
                "skip-player": "skip",
                "undo-bid": "undo",
                sell: "sell",
                unsold: "unsold",
                pause: "pause",
                resume: "resume",
              };
              void call(endpoint, labels[endpoint]);
            }}
          >
            Confirm previous action
          </Button>
        </div>
      )}
      {stale && (
        <p role="alert" className="text-[var(--warning)] text-sm">
          {error ??
            "Updates are delayed. Controls resume after the auction syncs."}
        </p>
      )}
      {teams.some((t) => (t.captain_settlement_shortfall ?? 0) > 0) && (
        <div
          role="alert"
          className="rounded-xl border border-[var(--warning-line)] p-4 text-sm"
        >
          <strong>Captain settlement needs attention</strong>
          {teams
            .filter((t) => (t.captain_settlement_shortfall ?? 0) > 0)
            .map((t) => (
              <p key={t.id}>
                {t.name}: estimated shortfall{" "}
                {formatINR(t.captain_settlement_shortfall!)}. The controller
                must resolve it before category closure.
              </p>
            ))}
        </div>
      )}
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Auction Console
          </h1>
          <p className="text-[11px] text-[var(--fg-3)] mt-1" role="status">
            {realtimeConnected
              ? "● Realtime connected"
              : "○ Reconnecting · automatic refresh active"}
          </p>
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
              disabled={busy !== null || (stale && !hasPending)}
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
              disabled={busy !== null || (stale && !hasPending)}
            >
              <Play size={13} strokeWidth={2} />
              Resume
            </Button>
          )}
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
        <div
          role="alert"
          className="text-[13px] rounded-lg p-3 border border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger)] animate-fade-down"
        >
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
                Playing captains are automatically allotted when their category
                is complete.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!isCaptain && (
              <>
                <Button
                  onClick={() => call("sell", "sell")}
                  loading={busy === "sell"}
                  disabled={
                    busy !== null ||
                    (stale && !hasPending) ||
                    !highestBid ||
                    !isLive
                  }
                >
                  <Check size={14} strokeWidth={2} />
                  Sell to{" "}
                  {teams.find((t) => t.id === highestBid?.team_id)?.name ?? "…"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => call("undo-bid", "undo")}
                  loading={busy === "undo"}
                  disabled={
                    busy !== null || (stale && !hasPending) || !highestBid
                  }
                >
                  <Undo2 size={14} strokeWidth={2} /> Undo last bid
                </Button>
              </>
            )}
            <Button
              variant="danger"
              onClick={() => call("unsold", "unsold")}
              loading={busy === "unsold"}
              disabled={busy !== null || (stale && !hasPending) || !isLive}
            >
              <X size={14} strokeWidth={2} />
              {isLegacyRoundTwo ? "Mark unsold" : "Unsold → Retry same player"}
            </Button>
            {canSkip && isRetry && !isLegacyRoundTwo && (
              <Button
                variant="outline"
                loading={busy === "skip"}
                disabled={busy !== null || (stale && !hasPending) || !isLive}
                onClick={() =>
                  call(
                    "skip-player",
                    "skip",
                    "Explicitly skip this unsold player and move to the next player in the same category? Main Controller authorization is required.",
                  )
                }
              >
                Skip player (controller only)
              </Button>
            )}
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
          disabled={hasCurrent || busy !== null || stale}
          onDraw={drawNext}
        />
      )}
    </div>
  );
}
