"use client";

import { TeamLogo } from "@/components/branding/TeamLogo";
import Link from "next/link";
import { useAuctionState } from "@/hooks/useAuctionState";
import { Card, CardBody } from "@/components/ui/card";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { SoldCelebration } from "@/components/auction/SoldCelebration";
import { AnimatedAmount } from "@/components/ui/animated-amount";
import { getBasePrice } from "@/constants/categories";

export function LiveViewer({
  auctionId,
  showPurse = false,
  viewerToken,
  teamLinkBase,
}: {
  auctionId: string;
  showPurse?: boolean;
  viewerToken?: string;
  teamLinkBase?: string;
}) {
  const { state, loading, realtimeConnected, stale } = useAuctionState(
    auctionId,
    2500,
    viewerToken,
  );

  if (loading || !state) {
    return (
      <div className="text-[13px] text-[var(--fg-3)]">
        {loading
          ? "Connecting to the auction…"
          : "Auction unavailable or access expired. Refresh or sign in again."}
      </div>
    );
  }

  const { auction, current, highestBid, teams } = state;
  const isLive = auction?.status === "LIVE";

  const basePrice = current?.player?.grade
    ? getBasePrice(auction?.config, current.player.grade)
    : 0;

  return (
    <div className="space-y-6 max-w-6xl animate-fade-up">
      <SoldCelebration lastSale={state.lastSale} />
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Live Auction
          </h1>
          <p className="text-[11px] text-[var(--fg-3)] mt-1" role="status">
            {stale
              ? "Updates delayed · reconnecting"
              : realtimeConnected
                ? "● Realtime connected"
                : "Live updates · automatic refresh active"}
          </p>
          <p className="text-[13px] text-[var(--fg-3)] mt-1">
            {auction?.name} ·{" "}
            <span
              className={`inline-flex items-center gap-1.5 ${
                isLive ? "text-[var(--success)]" : "text-[var(--warning)]"
              }`}
            >
              {isLive && <span className="live-dot" aria-hidden />}
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
            {teams.map((t, i) => {
              const card = (
                <Card
                  className={
                    teamLinkBase
                      ? "hover:border-[var(--accent-line)] hover:-translate-y-0.5 transition-[border-color,transform] duration-200 cursor-pointer h-full"
                      : "h-full"
                  }
                >
                  <CardBody className="p-3 text-center">
                    <TeamLogo
                      name={t.name}
                      src={t.logo_url}
                      className="!w-12 !h-12 mx-auto"
                    />
                    <div className="text-[12px] text-[var(--fg-1)] font-medium truncate mt-2">
                      {t.name}
                    </div>
                    {(showPurse ||
                      auction?.config.showPurseToViewers === true) &&
                      t.purse_visible === true && (
                        <div className="text-[12px] font-mono text-[var(--accent)] tnum mt-1">
                          <AnimatedAmount value={t.remaining_purse} />
                        </div>
                      )}
                    <div className="text-[10px] text-[var(--fg-4)] tnum mt-0.5">
                      {t.squad_count} players
                    </div>
                  </CardBody>
                </Card>
              );
              const delay = { animationDelay: `${i * 50}ms` };
              return teamLinkBase ? (
                <Link
                  key={t.id}
                  href={`${teamLinkBase}/${t.id}`}
                  className="block animate-fade-up"
                  style={delay}
                >
                  {card}
                </Link>
              ) : (
                <div key={t.id} className="animate-fade-up" style={delay}>
                  {card}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
