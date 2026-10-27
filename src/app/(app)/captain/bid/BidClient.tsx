"use client";

import { useState, useEffect, useRef } from "react";
import { useAuctionState } from "@/hooks/useAuctionState";
import { useBidAlerts, unlockAudio } from "@/hooks/useBidAlerts";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { SoldCelebration } from "@/components/auction/SoldCelebration";
import { AnimatedAmount } from "@/components/ui/animated-amount";
import { PurseMeter } from "@/components/auction/PurseMeter";
import {
  getBasePrice,
  getIncrement,
  DEFAULT_INCREMENT_PAISE,
} from "@/constants/categories";
import { formatINR } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Check, Gavel } from "lucide-react";

export function BidClient({
  auctionId,
  userId,
}: {
  auctionId: string;
  userId: string;
}) {
  const { state, loading, refresh, applyBid, realtimeConnected } =
    useAuctionState(auctionId, 1500);
  const bidInFlight = useRef(false);
  const [customAmount, setCustomAmount] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  useBidAlerts(state?.highestBid?.id ?? null);

  useEffect(() => {
    if (!msg || msg.kind === "err") return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  if (loading || !state) {
    return (
      <div
        role="status"
        className="rounded-xl border border-[var(--line-2)] p-8 text-sm text-[var(--fg-3)]"
      >
        {loading
          ? "Connecting to your auction…"
          : "Unable to load this auction. Check your connection or sign in again."}
        {!loading && (
          <button
            onClick={() => void refresh()}
            className="block text-[var(--accent)] mt-4"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  const { auction, current, highestBid, teams } = state;
  const isLive = auction?.status === "LIVE";
  const myTeam =
    teams.find(
      (t) => t.captain_user_id === userId || t.co_captain_user_id === userId,
    ) ?? null;

  const config = (auction?.config ?? {}) as { maxSquad?: number };
  const maxSquad = config.maxSquad ?? 18;

  // Per-category increment, falls back to global default if config has none
  const increment = current?.player?.grade
    ? getIncrement(auction?.config, current.player.grade)
    : DEFAULT_INCREMENT_PAISE;

  const basePrice = current?.player?.grade
    ? getBasePrice(auction?.config, current.player.grade)
    : 0;
  const currentBid = highestBid?.amount ?? 0;
  const isMyLead = highestBid && myTeam && highestBid.team_id === myTeam.id;

  const nextBid = currentBid === 0 ? basePrice : currentBid + increment;
  // The initial purse still shows its full balance, but captain base-price
  // reserves are unavailable for ordinary auction bids.
  const protectedCaptainReserve = myTeam
    ? (myTeam.reserved_grades ?? []).reduce(
        (sum, grade) => sum + getBasePrice(auction?.config, grade),
        0,
      )
    : 0;
  const availableToBid = Math.max(
    0,
    (myTeam?.remaining_purse ?? 0) - protectedCaptainReserve,
  );
  const purseAfter = availableToBid - nextBid;
  const purseOk = !!myTeam && purseAfter >= 0;
  const squadOk = myTeam
    ? myTeam.squad_count + (myTeam.reserved_slots ?? 0) < maxSquad
    : false;

  // NEW: one player per category per team
  const currentGrade = current?.player?.grade ?? null;
  const reservedCategory = !!(
    myTeam &&
    currentGrade &&
    myTeam.reserved_grades?.includes(currentGrade)
  );
  const alreadyOwnsCategory = !!(
    myTeam &&
    currentGrade &&
    (myTeam.won_grades?.includes(currentGrade) || reservedCategory)
  );

  // A playing captain is assigned by the auctioneer, never bid on.
  const captainTeam = current?.captainTeam ?? null;
  const isCaptain = !!captainTeam;

  async function placeBid(amount: number) {
    unlockAudio();
    if (!current || bidInFlight.current) return;
    if (
      !Number.isSafeInteger(amount) ||
      amount < nextBid ||
      amount > availableToBid
    ) {
      setMsg({
        kind: "err",
        text: "Enter a valid bid within your available virtual purse.",
      });
      return;
    }
    bidInFlight.current = true;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auctionPlayerId: current.id, amount }),
      });
      const body = await res.json().catch(() => ({}));
      setBusy(false);
      if (!res.ok) {
        setMsg({ kind: "err", text: body.error ?? "Bid failed" });
        return;
      }
      // The RPC has committed, so render the confirmed leader instantly.
      // Realtime then delivers it to auctioneer, captains and spectators.
      if (body.bid?.bid_id && body.bid?.team_id) {
        applyBid({
          id: body.bid.bid_id,
          auction_player_id: current.id,
          team_id: body.bid.team_id,
          amount: body.bid.amount,
          created_at: new Date().toISOString(),
        });
      }
      setMsg({
        kind: "ok",
        text: `Bid placed: ${formatINR(amount, { compact: true })}`,
      });
      setShowCustom(false);
      void refresh();
    } catch {
      setMsg({
        kind: "err",
        text: "Connection interrupted. Check the current bid before trying again.",
      });
      void refresh();
    } finally {
      bidInFlight.current = false;
      setBusy(false);
    }
  }

  const cannotBid =
    !isLive ||
    !current ||
    !myTeam ||
    !purseOk ||
    !squadOk ||
    isMyLead ||
    alreadyOwnsCategory ||
    isCaptain ||
    busy;

  return (
    <div className="max-w-6xl space-y-5 animate-fade-up">
      <SoldCelebration lastSale={state.lastSale} />
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Your bidding desk
          </h1>
          <p className="text-[11px] mt-1 text-[var(--fg-3)]" role="status">
            {realtimeConnected
              ? "● Live updates connected"
              : "○ Reconnecting · automatic refresh active"}
          </p>
          <p className="text-[13px] text-[var(--fg-3)] mt-1">
            {myTeam ? myTeam.name : "No team assigned"}
          </p>
        </div>
        {myTeam && (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
              Virtual purse
            </div>
            <div className="text-[18px] font-semibold text-[var(--accent)] tnum">
              <AnimatedAmount value={myTeam.remaining_purse} />
            </div>
            <div className="text-[11px] text-[var(--fg-4)] tnum">
              {myTeam.squad_count}/{maxSquad} players · Virtual credits
              available to bid: {formatINR(availableToBid, { compact: true })}
            </div>
            <PurseMeter
              available={availableToBid}
              total={Math.max(
                myTeam.initial_purse,
                myTeam.remaining_purse,
                myTeam.remaining_purse + myTeam.spent,
              )}
              label="Available after captain reserves"
            />
          </div>
        )}
      </header>

      {!myTeam && (
        <Card className="border-[var(--warning-line)] bg-[var(--warning-bg)]">
          <CardBody className="text-[13px] text-[var(--warning)] p-4">
            You are not assigned to a team yet. Contact the Main Controller.
          </CardBody>
        </Card>
      )}

      {msg && (
        <div
          role={msg.kind === "err" ? "alert" : "status"}
          className={`text-[13px] rounded-lg p-3 border animate-fade-down ${
            msg.kind === "err"
              ? "border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger)]"
              : "border-[var(--success-line)] bg-[var(--success-bg)] text-[var(--success)]"
          }`}
        >
          {msg.text}
        </div>
      )}

      {current?.player ? (
        <>
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
                {current.player.name} is the playing captain of{" "}
                {captainTeam.name}
              </div>
              <p className="text-[12px] text-[var(--fg-3)] mt-1">
                Bidding is closed for this player. The auctioneer will assign
                them to {captainTeam.name}.
              </p>
            </div>
          )}
          {alreadyOwnsCategory && !isCaptain && myTeam && currentGrade && (
            <div className="rounded-lg border border-[var(--warning-line)] bg-[var(--warning-bg)] p-4 animate-scale-in">
              <div className="text-[13px] text-[var(--warning)] font-medium">
                {reservedCategory
                  ? `Your playing captain reserves the ${currentGrade} category`
                  : `You already own a ${currentGrade} player`}
              </div>
              <p className="text-[12px] text-[var(--warning)] opacity-75 mt-1">
                Playing captains count toward the one-player-per-category rule.
                You cannot bid on this player.
              </p>
            </div>
          )}
          {isMyLead && (
            <div className="rounded-lg border border-[var(--success-line)] bg-[var(--success-bg)] p-4 text-center animate-scale-in">
              <div className="flex items-center justify-center gap-2 text-[13px] text-[var(--success)] font-medium">
                <Check size={14} strokeWidth={2.5} />
                You are the highest bidder
              </div>
              <p className="text-[12px] text-[var(--success)] opacity-70 mt-1">
                Wait for the auctioneer to confirm the sale.
              </p>
            </div>
          )}

          {!isMyLead && !isCaptain && isLive && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                onClick={() => placeBid(nextBid)}
                disabled={cannotBid}
                loading={busy}
                size="lg"
                className="col-span-2 md:col-span-1 h-16 text-[15px]"
              >
                Bid {formatINR(nextBid, { compact: true })}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-16 text-[13px]"
                onClick={() => placeBid(nextBid + increment)}
                disabled={cannotBid || nextBid + increment > availableToBid}
              >
                Bid {formatINR(nextBid + increment, { compact: true })}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-16 text-[13px]"
                onClick={() => placeBid(nextBid + increment * 4)}
                disabled={cannotBid || nextBid + increment * 4 > availableToBid}
              >
                Bid {formatINR(nextBid + increment * 4, { compact: true })}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-16 text-[13px]"
                onClick={() => setShowCustom((v) => !v)}
                aria-expanded={showCustom}
                aria-controls="custom-bid-form"
                disabled={cannotBid}
              >
                Custom
              </Button>
            </div>
          )}

          {showCustom && !cannotBid && (
            <form
              id="custom-bid-form"
              className="motion-panel flex items-end gap-3 rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void placeBid(Math.round(Number(customAmount) * 100));
              }}
            >
              <div className="flex-1">
                <label
                  htmlFor="custom-bid"
                  className="text-[11px] text-[var(--fg-2)]"
                >
                  Custom bid in virtual ₹ credits
                </label>
                <Input
                  id="custom-bid"
                  type="number"
                  inputMode="decimal"
                  min={nextBid / 100}
                  max={availableToBid / 100}
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  required
                  autoFocus
                  className="mt-2"
                />
              </div>
              <Button type="submit" disabled={cannotBid}>
                <Gavel size={16} /> Place bid
              </Button>
            </form>
          )}
          {!purseOk && myTeam && (
            <p className="text-[12px] text-[var(--danger)]">
              Insufficient bidding purse after protecting{" "}
              {formatINR(protectedCaptainReserve, { compact: true })} for
              playing captains.
            </p>
          )}
          {!squadOk && myTeam && (
            <p className="text-[12px] text-[var(--danger)]">
              Your squad is full ({maxSquad} players).
            </p>
          )}
        </>
      ) : (
        <Card>
          <CardBody className="text-[13px] text-[var(--fg-3)] py-16 text-center">
            {isLive
              ? "Waiting for a player to be drawn…"
              : "Auction not live yet."}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
