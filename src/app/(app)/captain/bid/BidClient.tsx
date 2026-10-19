"use client";

import { useState, useEffect } from "react";
import { useAuctionState } from "@/hooks/useAuctionState";
import { useBidAlerts, unlockAudio } from "@/hooks/useBidAlerts";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { SoldCelebration } from "@/components/auction/SoldCelebration";
import { AnimatedAmount } from "@/components/ui/animated-amount";
import {
  getBasePrice,
  getIncrement,
  DEFAULT_INCREMENT_PAISE,
} from "@/constants/categories";
import { formatINR } from "@/lib/utils";
import { Check } from "lucide-react";

export function BidClient({
  auctionId,
  userId,
}: {
  auctionId: string;
  userId: string;
}) {
  const { state, loading, refresh } = useAuctionState(auctionId, 1500);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );

  useBidAlerts(state?.highestBid?.id ?? null);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  if (loading || !state) {
    return <div className="text-[13px] text-[var(--fg-3)]">Loading…</div>;
  }

  const { auction, current, highestBid, teams } = state;
  const isLive = auction?.status === "LIVE";
  const myTeam = teams.find((t) => (t.captain_user_id === userId || t.co_captain_user_id === userId)) ?? null;

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
    ? (myTeam.reserved_grades ?? []).reduce((sum, grade) => sum + getBasePrice(auction?.config, grade), 0)
    : 0;
  const availableToBid = Math.max(0, (myTeam?.remaining_purse ?? 0) - protectedCaptainReserve);
  const purseAfter = availableToBid - nextBid;
  const purseOk = !!myTeam && purseAfter >= 0;
  const squadOk = myTeam ? myTeam.squad_count + (myTeam.reserved_slots ?? 0) < maxSquad : false;

  // NEW: one player per category per team
  const currentGrade = current?.player?.grade ?? null;
  const reservedCategory = !!(myTeam && currentGrade && myTeam.reserved_grades?.includes(currentGrade));
  const alreadyOwnsCategory =
    !!(myTeam && currentGrade && (myTeam.won_grades?.includes(currentGrade) || reservedCategory));

  // A playing captain is assigned by the auctioneer, never bid on.
  const captainTeam = current?.captainTeam ?? null;
  const isCaptain = !!captainTeam;

  async function placeBid(amount: number) {
    unlockAudio();
    if (!current) return;
    setBusy(true);
    setMsg(null);
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
    setMsg({ kind: "ok", text: `Bid placed: ${formatINR(amount, { compact: true })}` });
    refresh();
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
    <div className="max-w-3xl space-y-4 animate-fade-up">
      <SoldCelebration lastSale={state.lastSale} />
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Bid</h1>
          <p className="text-[13px] text-[var(--fg-3)] mt-1">
            {myTeam ? myTeam.name : "No team assigned"}
          </p>
        </div>
        {myTeam && (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
              Your purse
            </div>
            <div className="text-[18px] font-semibold text-[var(--accent)] tnum">
              <AnimatedAmount value={myTeam.remaining_purse} />
            </div>
            <div className="text-[11px] text-[var(--fg-4)] tnum">
              {myTeam.squad_count}/{maxSquad} players · Available to bid: {formatINR(availableToBid, { compact: true })}
            </div>
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
                {current.player.name} is the playing captain of {captainTeam.name}
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
                {reservedCategory ? `Your playing captain reserves the ${currentGrade} category` : `You already own a ${currentGrade} player`}
              </div>
              <p className="text-[12px] text-[var(--warning)] opacity-75 mt-1">
                Playing captains count toward the one-player-per-category rule. You cannot
                bid on this player.
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
      disabled={cannotBid}
    >
      Bid {formatINR(nextBid + increment, { compact: true })}
    </Button>
    <Button
      variant="outline"
      size="lg"
      className="h-16 text-[13px]"
      onClick={() => placeBid(nextBid + increment * 4)}
      disabled={cannotBid}
    >
      Bid {formatINR(nextBid + increment * 4, { compact: true })}
    </Button>
    <Button
      variant="outline"
      size="lg"
      className="h-16 text-[13px]"
      onClick={() => {
        const input = window.prompt(
          `Enter bid amount in ₹ (min ${(nextBid / 100).toFixed(0)})`,
          (nextBid / 100).toFixed(0)
        );
        if (!input) return;
        const rupees = Number(input);
        if (!Number.isFinite(rupees) || rupees <= 0) return;
        placeBid(Math.round(rupees * 100));
      }}
      disabled={cannotBid}
    >
      Custom
    </Button>
  </div>
)}

          {!purseOk && myTeam && (
            <p className="text-[12px] text-[var(--danger)]">
              Insufficient bidding purse after protecting {formatINR(protectedCaptainReserve, { compact: true })} for playing captains.
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