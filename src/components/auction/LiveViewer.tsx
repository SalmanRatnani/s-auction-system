"use client";

import Link from "next/link";
import { useAuctionState } from "@/hooks/useAuctionState";
import { Card, CardBody } from "@/components/ui/card";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { getBasePrice } from "@/constants/categories";
import { formatINR } from "@/lib/utils";

export function LiveViewer({
  auctionId,
  showPurse = false,
  teamLinkBase,
}: {
  auctionId: string;
  showPurse?: boolean;
  teamLinkBase?: string;
}) {
  const { state, loading } = useAuctionState(auctionId, 2500);

  if (loading || !state) {
    return <div className="text-[13px] text-[var(--fg-3)]">Loading…</div>;
  }

  const { auction, current, highestBid, teams } = state;
  const isLive = auction?.status === "LIVE";

  const basePrice = current?.player?.grade
  ? getBasePrice(auction?.config, current.player.grade)
  : 0;

  return (
    <div className="space-y-6 max-w-6xl animate-fade-up">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Live Auction
          </h1>
          <p className="text-[13px] text-[var(--fg-3)] mt-1">
            {auction?.name} ·{" "}
            <span
              className={
                isLive ? "text-[var(--success)]" : "text-[var(--warning)]"
              }
            >
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
          <CardBody className="text-[13px] text-[var(--fg-3)] py-16 text-center">
            {isLive
              ? "Waiting for the next player…"
              : "Auction hasn't started yet."}
          </CardBody>
        </Card>
      )}

      {teams.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)] mb-3">
            Teams{teamLinkBase ? " · tap to view roster" : ""}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {teams.map((t) => {
              const card = (
                <Card
                  className={
                    teamLinkBase
                      ? "hover:border-[var(--accent-line)] transition-colors duration-100 cursor-pointer h-full"
                      : "h-full"
                  }
                >
                  <CardBody className="p-3 text-center">
                    {t.logo_url ? (
                      <img
                        src={t.logo_url}
                        alt=""
                        className="h-10 w-10 mx-auto rounded-md object-cover border border-[var(--line-1)]"
                      />
                    ) : (
                      <div className="h-10 w-10 mx-auto rounded-md bg-[var(--bg-2)] border border-[var(--line-1)] grid place-items-center text-[10px] font-mono text-[var(--fg-4)]">
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="text-[12px] text-[var(--fg-1)] font-medium truncate mt-2">
                      {t.name}
                    </div>
                    {showPurse && (
                      <div className="text-[12px] font-mono text-[var(--accent)] tnum mt-1">
                        {formatINR(t.remaining_purse, { compact: true })}
                      </div>
                    )}
                    <div className="text-[10px] text-[var(--fg-4)] tnum mt-0.5">
                      {t.squad_count} players
                    </div>
                  </CardBody>
                </Card>
              );
              return teamLinkBase ? (
                <Link key={t.id} href={`${teamLinkBase}/${t.id}`}>
                  {card}
                </Link>
              ) : (
                <div key={t.id}>{card}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}