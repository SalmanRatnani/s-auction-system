"use client";
import { useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, RotateCcw, Check, Gavel, Info } from "lucide-react";
import { Logo } from "@/components/branding/Logo";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { TeamLogo } from "@/components/branding/TeamLogo";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { AnimatedAmount } from "@/components/ui/animated-amount";
const ROLES = ["Captain", "Auctioneer", "Spectator"] as const;
const MAX_BIDS = 80;
const ROLE_DETAILS = {
  Captain:
    "Your next move starts here. Place a sample bid and watch the leading team change.",
  Auctioneer:
    "Control the room. Simulate a bid, then confirm the sale to complete the moment.",
  Spectator:
    "A front-row seat to every bid. Simulate an update to see the live view in action.",
};
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
  const [role, setRole] = useState<(typeof ROLES)[number]>("Captain");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [bids, setBids] = useState(0);
  const [sold, setSold] = useState(false);
  const [stamp, setStamp] = useState("");
  const team = TEAMS[bids % TEAMS.length];
  const amount = 10000000 + bids * 500000;
  function bid() {
    if (sold || bids >= MAX_BIDS) return;
    setBids((n) => Math.min(MAX_BIDS, n + 1));
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
      <div className="flex items-end justify-between gap-4 flex-wrap animate-fade-up">
        <div>
          <span className="eyebrow">EXPLORE YOUR WORKSPACE</span>
          <h1 className="dashboard-title mt-3">Welcome to the auction room.</h1>
        </div>
        <button
          className="demo-reset flex items-center gap-2 text-xs text-[var(--fg-2)] p-3"
          onClick={reset}
        >
          <RotateCcw size={15} /> Reset demo
        </button>
      </div>
      <div
        className="demo-tabs"
        role="tablist"
        aria-label="Demo perspective"
        style={{ "--tab-index": ROLES.indexOf(role) } as CSSProperties}
      >
        {ROLES.map((r, index) => (
          <button
            key={r}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            id={`demo-tab-${r.toLowerCase()}`}
            role="tab"
            aria-controls="demo-perspective-panel"
            aria-selected={role === r}
            tabIndex={role === r ? 0 : -1}
            onClick={() => setRole(r)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % ROLES.length;
              else if (event.key === "ArrowLeft")
                next = (index + ROLES.length - 1) % ROLES.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = ROLES.length - 1;
              else return;
              event.preventDefault();
              setRole(ROLES[next]);
              tabs.current[next]?.focus();
            }}
          >
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
      <section
        id="demo-perspective-panel"
        className="demo-control-panel"
        role="tabpanel"
        aria-labelledby={`demo-tab-${role.toLowerCase()}`}
        tabIndex={0}
      >
        <div
          key={`copy-${role}`}
          className="demo-perspective-copy motion-panel"
        >
          <span className="eyebrow">{role.toUpperCase()} PERSPECTIVE</span>
          <p>{ROLE_DETAILS[role]}</p>
        </div>
        {sold ? (
          <div
            role="status"
            className="demo-sale flex items-center gap-3 p-5 rounded-xl bg-[var(--success-bg)] border border-[var(--success-line)] text-[var(--success)]"
          >
            <span className="sale-check">
              <Check size={22} />
            </span>
            <span>
              Sold to <strong>{team.name}</strong> for {formatINR(amount)} in
              virtual credits.
            </span>
          </div>
        ) : (
          <div
            key={`controls-${role}`}
            className="demo-controls motion-panel flex gap-3 items-center flex-wrap"
          >
            {role === "Captain" && (
              <Button size="lg" onClick={bid} disabled={bids >= MAX_BIDS}>
                <Gavel size={17} /> Place sample bid ·{" "}
                {formatINR(Math.min(50000000, amount + 500000))}
              </Button>
            )}
            {role === "Auctioneer" && (
              <>
                <Button onClick={() => setSold(true)} disabled={!bids}>
                  Confirm sample sale
                </Button>
                <Button
                  variant="outline"
                  onClick={bid}
                  disabled={bids >= MAX_BIDS}
                >
                  Simulate incoming bid
                </Button>
              </>
            )}
            {role === "Spectator" && (
              <>
                <span className="text-sm text-[var(--fg-2)]">
                  Spectators follow the action without bidding access.
                </span>
                <Button
                  variant="outline"
                  onClick={bid}
                  disabled={bids >= MAX_BIDS}
                >
                  Simulate next update
                </Button>
              </>
            )}
          </div>
        )}
        <p className="demo-feedback" role="status" aria-atomic="true">
          {sold
            ? "Sale complete. Reset the demo to start again."
            : bids >= MAX_BIDS
              ? "Sample purse limit reached. Switch to Auctioneer to confirm the sale, or reset the demo."
              : bids
                ? `Sample bid accepted · ${team.name} leads at ${formatINR(amount)}.`
                : "Ready when you are. No real auction data is affected."}
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-3 stagger-enter">
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
              <AnimatedAmount
                value={50000000 - (sold && t.id === team.id ? amount : 0)}
              />
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
