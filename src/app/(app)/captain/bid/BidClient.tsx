"use client";

import { useState, useEffect } from "react";
import { useAuctionState } from "@/hooks/useAuctionState";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { DEFAULT_BASE_PRICES, DEFAULT_INCREMENT_PAISE, type Category } from "@/constants/categories";
import { formatINR } from "@/lib/utils";
import { useBidAlerts } from "@/hooks/useBidAlerts";

export function BidClient({
  auctionId,
  userId,
}: {
  auctionId: string;
  userId: string;
}) {
  const { state, loading, refresh } = useAuctionState(auctionId, 1500); // 3s polling fallback
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Trigger sound + vibration when a new bid arrives from someone else
    // Hooks must run unconditionally, before any early return.
  useBidAlerts(state?.highestBid?.id ?? null);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  if (loading || !state) return <div className="text-white/50">Loading…</div>;

  const { auction, current, highestBid, teams } = state;
  const isLive = auction?.status === "LIVE";
  const myTeam = teams.find((t) => t.captain_user_id === userId) ?? null;

  const config = (auction?.config ?? {}) as {
    increment?: { value: number };
    maxSquad?: number;
  };
  const increment = config.increment?.value ?? DEFAULT_INCREMENT_PAISE;
  const maxSquad = config.maxSquad ?? 18;

  const basePrice =
    current?.player?.grade != null
      ? DEFAULT_BASE_PRICES[current.player.grade as Category] ?? 0
      : 0;
  const currentBid = highestBid?.amount ?? 0;
  const isMyLead = highestBid && myTeam && highestBid.team_id === myTeam.id;

  const nextBid = currentBid === 0 ? basePrice : currentBid + increment;

  const purseAfter = myTeam ? myTeam.remaining_purse - nextBid : 0;
  const purseOk = myTeam && purseAfter >= 0;
  const squadOk = myTeam ? myTeam.squad_count < maxSquad : false;

  async function placeBid(amount: number) {
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
    busy;

  return (
    <div className="max-w-3xl space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Bid</h1>
          <p className="text-white/50 text-sm mt-1">
            {myTeam ? `You are: ${myTeam.name}` : "You have no team assigned."}
          </p>
        </div>
        {myTeam && (
          <div className="text-right">
            <div className="text-xs text-white/50 uppercase tracking-wider">Your purse</div>
            <div className="text-lg md:text-xl font-bold text-emerald-300">
              {formatINR(myTeam.remaining_purse, { compact: true })}
            </div>
            <div className="text-xs text-white/40">
              {myTeam.squad_count}/{maxSquad} players
            </div>
          </div>
        )}
      </header>

      {!myTeam && (
        <Card className="border-amber-500/30">
          <CardBody className="text-sm text-amber-300">
            You are not assigned to a team yet. Contact the Main Controller.
          </CardBody>
        </Card>
      )}

      {msg && (
        <div
          className={`text-sm rounded-lg p-3 border ${
            msg.kind === "err"
              ? "bg-red-500/10 border-red-500/30 text-red-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
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
            teams={teams}
          />

          {isMyLead && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center">
              <div className="text-emerald-300 font-semibold">
                🏆 You're the highest bidder
              </div>
              <p className="text-xs text-emerald-300/70 mt-1">
                Wait for the auctioneer to confirm the sale.
              </p>
            </div>
          )}

          {!isMyLead && isLive && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                onClick={() => placeBid(nextBid)}
                disabled={cannotBid}
                loading={busy}
                size="lg"
                className="col-span-2 md:col-span-1 h-16 text-base"
              >
                BID {formatINR(nextBid, { compact: true })}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-16"
                onClick={() => placeBid(nextBid + increment)}
                disabled={cannotBid}
              >
                +2× · {formatINR(nextBid + increment, { compact: true })}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-16"
                onClick={() => placeBid(nextBid + increment * 4)}
                disabled={cannotBid}
              >
                +5× · {formatINR(nextBid + increment * 4, { compact: true })}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-16"
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
            <p className="text-xs text-red-300">
              Insufficient purse for the next minimum bid.
            </p>
          )}
          {!squadOk && myTeam && (
            <p className="text-xs text-red-300">
              Your squad is full ({maxSquad} players).
            </p>
          )}
        </>
      ) : (
        <Card>
          <CardBody className="text-white/50 text-sm py-12 text-center">
            {isLive
              ? "Waiting for a player to be drawn…"
              : "Auction not live yet."}
          </CardBody>
        </Card>
      )}
    </div>
  );
}