"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, RotateCcw, Check, Gavel, Info } from "lucide-react";
import { Logo } from "@/components/branding/Logo";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { TeamLogo } from "@/components/branding/TeamLogo";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
const TEAMS = [
  { id: "demo-smash", name: "Smash Kings" },
  { id: "demo-net", name: "Net Ninjas" },
  { id: "demo-court", name: "Court Titans" },
];
const PLAYER = {
  id: "demo-player",
  player_code: "SAMPLE 042",
  name: "Aarav Sharma",
  grade: "A+",
  image_url: null,
  playing_hand: "Right",
  playing_centre: "Mumbai",
  achievements:
    "A sample player profile. Your registered players’ photos, grades and achievements appear here during an auction.",
};
export function DemoRoom() {
  const [role, setRole] = useState("Captain");
  const [bids, setBids] = useState(0);
  const [sold, setSold] = useState(false);
  const [stamp, setStamp] = useState("");
  const team = TEAMS[bids % TEAMS.length];
  const amount = 10000000 + bids * 500000;
  function bid() {
    setBids((n) => n + 1);
    setStamp(new Date().toISOString());
  }
  function reset() {
    setBids(0);
    setSold(false);
    setStamp("");
  }
  return (
    <div className="demo-shell space-y-7">
      <header className="flex items-center justify-between gap-4">
        <Logo href="/" />
        <Link href="/login" className="arena-button">
          Sign in <ArrowUpRight size={17} />
        </Link>
      </header>
      <div className="flex gap-3 rounded-lg border border-[var(--accent-line)] bg-[var(--accent-bg)] p-4">
        <Info size={18} className="text-[var(--accent)] shrink-0" />
        <p className="text-[12px] leading-6 text-[var(--fg-2)]">
          <strong className="text-[var(--fg-1)]">Interactive demo.</strong>{" "}
          Sample players, teams and virtual credits. Changes stay on this page
          and reset when you reload.
        </p>
      </div>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="eyebrow">EXPLORE YOUR WORKSPACE</span>
          <h1 className="dashboard-title mt-3">Welcome to the auction room.</h1>
        </div>
        <button
          className="flex items-center gap-2 text-xs text-[var(--fg-2)] p-3"
          onClick={reset}
        >
          <RotateCcw size={15} /> Reset demo
        </button>
      </div>
      <div className="demo-tabs" role="group" aria-label="Demo perspective">
        {["Captain", "Auctioneer", "Spectator"].map((r) => (
          <button key={r} onClick={() => setRole(r)} aria-pressed={role === r}>
            {r}
          </button>
        ))}
      </div>
      <PlayerOnBlock
        player={PLAYER}
        basePrice={10000000}
        currentBid={bids ? amount : null}
        highestBid={
          bids
            ? {
                id: `sample-${bids}`,
                amount,
                team_id: team.id,
                created_at: stamp,
              }
            : null
        }
        teams={TEAMS}
      />
      <div aria-live="polite">
        {sold ? (
          <div className="flex items-center gap-3 p-5 rounded-xl bg-[var(--success-bg)] border border-[var(--success-line)] text-[var(--success)]">
            <Check size={22} />
            <span>
              Sold to <strong>{team.name}</strong> for {formatINR(amount)} in
              virtual credits.
            </span>
          </div>
        ) : (
          <div className="flex gap-3 items-center flex-wrap">
            {role === "Captain" && (
              <Button size="lg" onClick={bid}>
                <Gavel size={17} /> Place sample bid ·{" "}
                {formatINR(bids ? amount + 500000 : 10500000)}
              </Button>
            )}
            {role === "Auctioneer" && (
              <>
                <Button onClick={() => setSold(true)} disabled={!bids}>
                  Confirm sample sale
                </Button>
                <Button variant="outline" onClick={bid}>
                  Simulate incoming bid
                </Button>
              </>
            )}
            {role === "Spectator" && (
              <>
                <span className="text-sm text-[var(--fg-2)]">
                  Spectators follow the action without bidding access.
                </span>
                <Button variant="outline" onClick={bid}>
                  Simulate next update
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {TEAMS.map((t) => (
          <div key={t.id} className="stat-tile">
            <div>
              <TeamLogo name={t.name} />
              <span className="eyebrow">
                {sold && t.id === team.id ? "1 PLAYER" : "0 PLAYERS"}
              </span>
            </div>
            <h2 className="text-lg mt-5">{t.name}</h2>
            <strong className="!text-2xl text-[var(--accent)]">
              {formatINR(50000000 - (sold && t.id === team.id ? amount : 0), {
                compact: true,
              })}
            </strong>
            <small>Sample virtual purse</small>
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--fg-3)] leading-6 border-t border-[var(--line-2)] pt-6">
        Explore all three perspectives above. In your real auction, role
        permissions, bid validation and purse changes are enforced by the
        backend.
      </p>
    </div>
  );
}
