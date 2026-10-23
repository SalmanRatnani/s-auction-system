"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  Users,
  Trophy,
  Layers,
  Wallet,
  Radio,
} from "lucide-react";
import { useAuctionState } from "@/hooks/useAuctionState";
import { TeamLogo } from "@/components/branding/TeamLogo";
import { formatINR } from "@/lib/utils";
import { AnimatedAmount } from "@/components/ui/animated-amount";

export function AuctionOverview({
  auctionId,
  destination,
}: {
  auctionId: string;
  destination: string;
}) {
  const { state, loading, refresh, realtimeConnected } = useAuctionState(
    auctionId,
    5000,
  );
  if (loading)
    return (
      <div role="status" className="stat-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="stat-tile animate-shimmer h-32">
            <span className="eyebrow">Loading auction…</span>
          </div>
        ))}
      </div>
    );
  if (!state)
    return (
      <div
        className="rounded-xl border border-[var(--warning-line)] p-5 text-sm text-[var(--fg-2)]"
        role="alert"
      >
        Auction details are unavailable.{" "}
        <button
          onClick={() => void refresh()}
          className="text-[var(--accent)] underline ml-2"
        >
          Try again
        </button>
      </div>
    );
  const { auction, teams, counts, current, lastSale } = state;
  const rostered = teams.reduce((n, t) => n + t.squad_count, 0);
  const pending = Object.values(counts).reduce((n, v) => n + v, 0);
  const spent = teams.reduce((n, t) => n + t.spent, 0);
  return (
    <>
      <div className="dashboard-banner animate-fade-up">
        <div>
          <div className="flex gap-3 items-center">
            <span className="eyebrow !text-[var(--accent)]">
              {auction?.mode === "DRY_RUN"
                ? "PRACTICE AUCTION"
                : "AUCTION OVERVIEW"}
            </span>
            <span className="text-[9px] rounded-md px-2 py-1 bg-white/10">
              {auction?.status}
            </span>
          </div>
          <h2>{auction?.name}</h2>
          <p>
            {auction?.status === "ENDED"
              ? "The final call is in. Explore your teams and completed rosters."
              : current?.player
                ? `${current.player.name} is on the block. Follow the action in your auction room.`
                : "Your players, teams and next moves. All in one place."}
          </p>
        </div>
        <Link href={destination} className="arena-button shrink-0">
          Open auction room <ArrowUpRight size={18} />
        </Link>
      </div>
      <div
        className="flex items-center gap-2 text-[10px] text-[var(--fg-3)]"
        role="status"
      >
        <Radio
          size={13}
          className={
            realtimeConnected
              ? "text-[var(--success)]"
              : "text-[var(--warning)]"
          }
        />
        {realtimeConnected
          ? "Live updates connected"
          : "Automatic refresh active · reconnecting to live updates"}
      </div>
      <div className="stat-grid stagger-enter">
        {[
          {
            label: "TEAMS",
            value: teams.length,
            detail: "In this auction",
            Icon: Users,
          },
          {
            label: "PLAYERS ROSTERED",
            value: rostered,
            detail: "Including allotted captains",
            Icon: Trophy,
          },
          {
            label: "QUEUED PLAYERS",
            value: pending,
            detail: "Ordinary players awaiting a draw",
            Icon: Layers,
          },
          {
            label: "VIRTUAL SPEND",
            value: formatINR(spent, { compact: true }),
            detail: "Across all teams",
            Icon: Wallet,
          },
        ].map(({ label, value, detail, Icon }) => (
          <div key={label} className="stat-tile">
            <div>
              <span className="eyebrow">{label}</span>
              <Icon size={17} className="text-[var(--accent)]" />
            </div>
            <strong>
              <span key={value} className="amount-update">
                {value}
              </span>
            </strong>
            <small>{detail}</small>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] stagger-enter">
        <section className="rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base">Teams in the arena</h3>
            <Link
              href="/captain/teams"
              className="text-[11px] text-[var(--accent)]"
            >
              View rosters ↗
            </Link>
          </div>
          {teams.length ? (
            teams.map((team) => (
              <div key={team.id} className="dashboard-team-row">
                <TeamLogo name={team.name} src={team.logo_url} />
                <div className="min-w-0 flex-1">
                  <strong className="truncate">{team.name}</strong>
                  <small>{team.squad_count} players rostered</small>
                </div>
                <div className="text-right">
                  <strong className="tnum text-[var(--accent)]">
                    <AnimatedAmount value={team.remaining_purse} />
                  </strong>
                  <small>Virtual purse</small>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--fg-3)] py-8">
              Teams will appear here when the organizer adds them.
            </p>
          )}
        </section>
        <section className="rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] p-6">
          <span className="eyebrow">LATEST ALLOTMENT</span>
          {lastSale ? (
            <>
              <Trophy size={28} className="mt-8 text-[var(--accent)]" />
              <h3 className="text-2xl mt-5">{lastSale.player_name}</h3>
              <p className="text-sm text-[var(--fg-2)] mt-2">
                {lastSale.team_name} · {lastSale.grade}
              </p>
              <p className="text-3xl tnum text-[var(--accent)] mt-5">
                {formatINR(lastSale.price, { compact: true })}
              </p>
              <p className="text-[11px] text-[var(--fg-3)] mt-2">
                Virtual auction credits
              </p>
            </>
          ) : (
            <>
              <Trophy size={28} className="mt-8 text-[var(--fg-3)]" />
              <h3 className="text-xl mt-5">The first chapter awaits.</h3>
              <p className="text-sm leading-7 text-[var(--fg-3)] mt-3">
                Your latest player allotment will appear here once a sale is
                confirmed or a playing captain is assigned.
              </p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
