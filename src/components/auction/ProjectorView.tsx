"use client";

import { useAuctionState } from "@/hooks/useAuctionState";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { SoldCelebration } from "@/components/auction/SoldCelebration";
import { AnimatedAmount } from "@/components/ui/animated-amount";
import { getBasePrice } from "@/constants/categories";
import { formatINR } from "@/lib/utils";

export function ProjectorView({
  auctionId,
  showPurse = false,
}: {
  auctionId: string;
  showPurse?: boolean;
}) {
  const { state, loading, realtimeConnected } = useAuctionState(auctionId, 2000);

  if (loading || !state) {
    return (
      <div className="min-h-screen grid place-items-center text-[13px] text-[var(--fg-3)]">
        Loading…
      </div>
    );
  }

  const { auction, current, highestBid, teams } = state;
  const isLive = auction?.status === "LIVE";
  const basePrice = current?.player?.grade
  ? getBasePrice(auction?.config, current.player.grade)
  : 0;

  const leader = highestBid
    ? teams.find((t) => t.id === highestBid.team_id)
    : null;

  return (
    <div className="min-h-screen flex flex-col p-8 md:p-12">
      <SoldCelebration lastSale={state.lastSale} />
      <header className="flex items-center justify-between mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--fg-4)]">
            S Auction System
          </div>
          <div className="text-[24px] font-semibold tracking-tight mt-1">
            {auction?.name}
          </div>
          <div className="text-[11px] text-[var(--fg-4)] mt-1" role="status">
            {realtimeConnected ? "● Realtime connected" : "○ Reconnecting · automatic refresh active"}
          </div>
        </div>
        <div
          className={`inline-flex items-center gap-2 text-[12px] font-medium px-2.5 py-1 rounded-md border ${
            isLive
              ? "bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-line)]"
              : "bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-line)]"
          }`}
        >
          {isLive && <span className="live-dot" aria-hidden />}
          {auction?.status}
        </div>
      </header>

      {current?.player ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          <div className="lg:col-span-2 space-y-6">
            <PlayerOnBlock
              player={current.player}
              highestBid={highestBid}
              basePrice={basePrice}
              currentBid={highestBid?.amount ?? 0}
              teams={teams.map((t) => ({ id: t.id, name: t.name }))}
            />
            {leader && (
              <div
                key={leader.id}
                className="text-center py-6 rounded-xl border border-[var(--accent-line)] bg-[var(--accent-bg)] animate-scale-in"
              >
                <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--accent)] opacity-70">
                  Leading bid
                </div>
                <div className="text-[44px] md:text-[56px] font-semibold text-[var(--accent)] leading-none mt-2">
                  {leader.name}
                </div>
                <div
                  key={highestBid!.id}
                  className="text-[24px] font-medium text-[var(--fg-1)] tnum mt-3 animate-bid-pop"
                >
                  {formatINR(highestBid!.amount, { compact: true })}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--fg-4)] mb-3">
              Teams
            </div>
            <div className="space-y-2">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-[border-color,background-color] duration-500 ${
                    leader?.id === t.id
                      ? "border-[var(--accent-line)] bg-[var(--accent-bg)] animate-row-flash"
                      : "border-[var(--line-1)] bg-[var(--bg-1)]"
                  }`}
                >
                  {t.logo_url ? (
                    <img
                      src={t.logo_url}
                      alt=""
                      className="h-10 w-10 rounded-md object-cover border border-[var(--line-1)]"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-[var(--bg-2)] border border-[var(--line-1)] grid place-items-center text-[10px] font-mono text-[var(--fg-4)]">
                      {t.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-[13px] font-medium truncate ${
                        leader?.id === t.id
                          ? "text-[var(--accent)]"
                          : "text-[var(--fg-1)]"
                      }`}
                    >
                      {t.name}
                    </div>
                    <div className="text-[10px] text-[var(--fg-4)] tnum">
                      {t.squad_count} players
                    </div>
                  </div>
                  {showPurse && (
                    <div
                      className={`text-[13px] font-mono tnum ${
                        leader?.id === t.id
                          ? "text-[var(--accent)]"
                          : "text-[var(--fg-2)]"
                      }`}
                    >
                      <AnimatedAmount value={t.remaining_purse} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid place-items-center">
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--fg-4)]">
              {isLive ? "Next up" : "Auction"}
            </div>
            <div className="text-[36px] font-semibold text-[var(--fg-2)] mt-2">
              {isLive ? "Waiting for the next player" : "Hasn't started"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}