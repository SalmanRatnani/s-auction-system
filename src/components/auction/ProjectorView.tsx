"use client";

import { useAuctionState } from "@/hooks/useAuctionState";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { DEFAULT_BASE_PRICES, type Category } from "@/constants/categories";
import { formatINR } from "@/lib/utils";

export function ProjectorView({
  auctionId,
  showPurse = true,
}: {
  auctionId: string;
  showPurse?: boolean;
}) {
  const { state, loading } = useAuctionState(auctionId, 2000);

  if (loading || !state) {
    return (
      <div className="min-h-screen grid place-items-center text-white/50">
        Loading…
      </div>
    );
  }

  const { auction, current, highestBid, teams } = state;
  const isLive = auction?.status === "LIVE";
  const basePrice =
    current?.player?.grade != null
      ? DEFAULT_BASE_PRICES[current.player.grade as Category] ?? 0
      : 0;

  const leader = highestBid
    ? teams.find((t) => t.id === highestBid.team_id)
    : null;

  return (
    <div className="min-h-screen flex flex-col p-6 md:p-10">
      <header className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40">
            S Auction System
          </div>
          <div className="text-2xl font-bold">{auction?.name}</div>
        </div>
        <div
          className={`text-sm font-bold px-3 py-1 rounded-full border ${
            isLive
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
              : "bg-amber-500/15 text-amber-300 border-amber-500/40"
          }`}
        >
          {auction?.status}
        </div>
      </header>

      {current?.player ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          <div className="lg:col-span-2">
            <PlayerOnBlock
              player={current.player}
              highestBid={highestBid}
              basePrice={basePrice}
              currentBid={highestBid?.amount ?? 0}
              teams={teams.map((t) => ({ id: t.id, name: t.name }))}
            />
            {leader && (
              <div className="mt-4 text-center py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40">
                <div className="text-xs uppercase tracking-widest text-emerald-300/70">
                  Leading bid
                </div>
                <div className="text-4xl md:text-5xl font-black text-emerald-300 mt-1">
                  {leader.name}
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {formatINR(highestBid!.amount, { compact: true })}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-white/40 mb-3">
              Teams
            </div>
            <div className="space-y-2">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    leader?.id === t.id
                      ? "border-emerald-400/60 bg-emerald-500/10"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  {t.logo_url ? (
                    <img
                      src={t.logo_url}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover border border-white/10"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 grid place-items-center">
                      🏸
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{t.name}</div>
                    <div className="text-[10px] text-white/40">
                      {t.squad_count} players
                    </div>
                  </div>
                  {showPurse && (
                    <div className="text-sm font-mono text-emerald-300">
                      {formatINR(t.remaining_purse, { compact: true })}
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
            <div className="text-6xl mb-4">🏸</div>
            <div className="text-2xl font-bold text-white/70">
              {isLive ? "Next player coming up…" : "Auction hasn't started"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}