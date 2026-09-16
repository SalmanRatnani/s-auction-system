"use client";

import { useAuctionState } from "@/hooks/useAuctionState";
import { Card, CardBody } from "@/components/ui/card";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { DEFAULT_BASE_PRICES, type Category } from "@/constants/categories";
import { formatINR } from "@/lib/utils";

export function LiveViewer({
  auctionId,
  showPurse = true,
}: {
  auctionId: string;
  showPurse?: boolean;
}) {
  const { state, loading } = useAuctionState(auctionId, 4000);

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
          <h1 className="text-3xl font-bold">Live Auction</h1>
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

      {showPurse && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {teams.map((t) => (
            <Card key={t.id}>
              <CardBody className="p-3 text-center">
                <div className="text-xs text-white/50 truncate">{t.name}</div>
                <div className="text-sm font-bold text-emerald-300 mt-1">
                  {formatINR(t.remaining_purse, { compact: true })}
                </div>
                <div className="text-[10px] text-white/40">
                  {t.squad_count} players
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}