"use client";

import Link from "next/link";
import { useAuctionState } from "@/hooks/useAuctionState";
import { Card, CardBody } from "@/components/ui/card";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { DEFAULT_BASE_PRICES, type Category } from "@/constants/categories";
import { formatINR } from "@/lib/utils";

export function LiveViewer({
  auctionId,
  showPurse = true,
  teamLinkBase,
}: {
  auctionId: string;
  showPurse?: boolean;
  teamLinkBase?: string; // e.g. `/watch/<token>/team` or `/viewer/team`
}) {
  const { state, loading } = useAuctionState(auctionId, 2500);

  if (loading || !state) return <div className="text-white/50">Loading…</div>;

  const { auction, current, highestBid, teams } = state;
  const isLive = auction?.status === "LIVE";

  const basePrice =
    current?.player?.grade != null
      ? DEFAULT_BASE_PRICES[current.player.grade as Category] ?? 0
      : 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Live Auction</h1>
          <p className="text-white/50 text-sm mt-1">
            {auction?.name} ·{" "}
            <span className={isLive ? "text-emerald-300" : "text-amber-300"}>
              {auction?.status}
            </span>
          </p>
        </div>
      </header>

      {current?.player ? (
        <PlayerOnBlock
          player={current.player}
          highestBid={highestBid}
          basePrice={basePrice}
          currentBid={highestBid?.amount ?? 0}
          teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        />
      ) : (
        <Card>
          <CardBody className="text-white/50 text-sm py-12 text-center">
            {isLive ? "Waiting for the next player…" : "Auction hasn't started."}
          </CardBody>
        </Card>
      )}

      {teams.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">
            Teams {teamLinkBase ? "· tap to view roster" : ""}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {teams.map((t) => {
              const inner = (
                <Card className={teamLinkBase ? "surface-hover cursor-pointer h-full" : "h-full"}>
                  <CardBody className="p-3 text-center">
                    {t.logo_url ? (
                      <img
                        src={t.logo_url}
                        alt=""
                        className="h-12 w-12 mx-auto rounded-lg object-cover border border-white/10"
                      />
                    ) : (
                      <div className="h-12 w-12 mx-auto rounded-lg bg-white/5 border border-white/10 grid place-items-center">
                        🏸
                      </div>
                    )}
                    <div className="text-xs text-white/70 truncate mt-2">
                      {t.name}
                    </div>
                    {showPurse && (
                      <div className="text-sm font-bold text-emerald-300 mt-1">
                        {formatINR(t.remaining_purse, { compact: true })}
                      </div>
                    )}
                    <div className="text-[10px] text-white/40 mt-0.5">
                      {t.squad_count} players
                    </div>
                  </CardBody>
                </Card>
              );

              return teamLinkBase ? (
                <Link key={t.id} href={`${teamLinkBase}/${t.id}`}>
                  {inner}
                </Link>
              ) : (
                <div key={t.id}>{inner}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}