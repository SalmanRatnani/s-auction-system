"use client";

import { useState } from "react";
import { ArrowUpRight, Gavel, Radio, TrendingUp, Zap } from "lucide-react";

const TEAMS = ["Smash Kings", "Court Crew", "Ace Squad", "Net Ninjas"];
const MONEY = new Intl.NumberFormat("en-IN");

export function AuctionPreview() {
  const [bid, setBid] = useState(145000);
  const [count, setCount] = useState(12);
  const [leader, setLeader] = useState(0);
  const [recent, setRecent] = useState<string[]>(["Smash Kings · ₹1,45,000", "Court Crew · ₹1,40,000", "Ace Squad · ₹1,35,000"]);

  function placeDemoBid() {
    const next = bid + 5000;
    const nextLeader = (leader + 1) % TEAMS.length;
    setBid(next);
    setCount((n) => n + 1);
    setLeader(nextLeader);
    setRecent((prev) => [`${TEAMS[nextLeader]} · ₹${MONEY.format(next)}`, ...prev].slice(0, 3));
  }

  function resetDemo() {
    setBid(145000);
    setCount(12);
    setLeader(0);
    setRecent(["Smash Kings · ₹1,45,000", "Court Crew · ₹1,40,000", "Ace Squad · ₹1,35,000"]);
  }

  return (
    <div className="auction-demo relative mx-auto w-full max-w-[635px]" aria-label="Interactive illustration of the S Auction bidding interface">
      <div className="auction-demo-glint" aria-hidden="true" />
      <div className="auction-demo-topbar">
        <div className="flex items-center gap-2.5">
          <span className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-[#e57867]/80" /><span className="h-2 w-2 rounded-full bg-[#e9ba5d]/80" /><span className="h-2 w-2 rounded-full bg-[#6fae91]/80" /></span>
          <span className="ml-2 font-mono text-[10px] tracking-wider text-[var(--fg-3)]">S AUCTION / ARENA</span>
        </div>
        <span className="rounded-full border border-[var(--accent-line)] bg-[var(--accent-bg)] px-2.5 py-1 font-mono text-[9px] tracking-widest text-[var(--accent)]">INTERACTIVE DEMO</span>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-3)]"><Radio size={14} className="text-[var(--accent)]" /> Auction room preview</span>
          <span className="font-mono text-[10px] text-[var(--fg-4)]">LOT #042</span>
        </div>

        <div className="auction-player-card">
          <div className="auction-player-art" aria-hidden="true">
            <div className="auction-art-orbit" />
            <svg viewBox="0 0 250 240" className="relative z-10 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="125" cy="108" r="91" stroke="#D7BC7A" strokeOpacity=".22" />
              <circle cx="125" cy="108" r="70" stroke="#D7BC7A" strokeOpacity=".12" strokeDasharray="4 7" />
              <path d="M41 220c8-54 32-75 84-75s76 21 84 75" fill="#325B4E" />
              <path d="M61 220c7-36 20-61 46-69l18 20 18-20c26 8 39 33 46 69" fill="#527965" />
              <path d="M113 149l12 22 12-22" stroke="#D6B971" strokeWidth="3" />
              <rect x="108" y="124" width="34" height="36" rx="10" fill="#B88969" />
              <ellipse cx="125" cy="93" rx="47" ry="55" fill="#BA8866" />
              <path d="M79 93c0-46 17-66 46-66 34 0 54 27 47 68-10-13-15-22-17-31-24 10-49 13-76 12V93Z" fill="#1A2D28" />
              <path d="M95 107c8 6 16 6 21 1M136 108c6 5 14 5 20-1" stroke="#734F3B" strokeWidth="2" strokeLinecap="round" />
              <path d="M113 130c9 5 17 5 25 0" stroke="#84523E" strokeWidth="2" strokeLinecap="round" />
              <path d="M60 218h130" stroke="#D7BC7A" strokeOpacity=".35" strokeWidth="2" />
              <path d="M29 29l20 0m-10-10v20M201 42l16 0m-8-8v16" stroke="#D7BC7A" strokeOpacity=".6" />
            </svg>
            <span className="absolute bottom-3 left-3 rounded-md border border-white/15 bg-[#10241e]/75 px-2 py-1 font-mono text-[10px] text-white/75 backdrop-blur-md">MEN&apos;S SINGLES</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between p-4 sm:p-5">
            <div>
              <span className="font-mono text-[10px] tracking-[0.15em] text-[var(--accent)]">PLAYER ON THE BLOCK</span>
              <h3 className="mt-3 text-[27px] font-semibold leading-[1.06] tracking-[-0.04em] sm:text-[31px]">Aarav<br />Sharma</h3>
              <span className="mt-3 inline-flex items-center rounded-md border border-[var(--accent-line)] bg-[var(--accent-bg)] px-2 py-1 text-[10px] font-semibold tracking-wider text-[var(--accent)]">GRADE A+</span>
            </div>
            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fg-4)]">Starting price</div>
              <div className="mt-1 text-[17px] font-medium">₹1,00,000</div>
            </div>
          </div>
        </div>

        <div className="auction-bid-panel mt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] tracking-[0.17em] text-[var(--fg-3)]">CURRENT HIGHEST BID</span>
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--success)]"><TrendingUp size={12} /> + ₹5,000</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div key={bid} className="auction-bid-number font-semibold tabular-nums leading-none" aria-live="polite" aria-atomic="true">₹{MONEY.format(bid)}</div>
            <span className="font-mono text-[11px] text-[var(--fg-4)]">{count} bids</span>
          </div>
          <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-4">
            <span className="flex min-w-0 items-center gap-2 text-[12px] text-[var(--fg-3)]"><span className="landing-status-dot !h-[6px] !w-[6px]" /> Leading <strong className="truncate font-medium text-[var(--fg-1)]">{TEAMS[leader]}</strong></span>
            <span className="font-mono text-[10px] text-[var(--fg-4)]">INCREMENT ₹5K</span>
          </div>
        </div>

        <button type="button" onClick={placeDemoBid} className="auction-demo-bid-button group mt-4 w-full">
          <span className="flex items-center gap-2"><Gavel size={17} /> Place demo bid <span className="opacity-65">+ ₹5,000</span></span>
          <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
        </button>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[10px] leading-5 text-[var(--fg-4)]">Preview only — no real bids are placed.</p>
          <button type="button" onClick={resetDemo} className="text-[11px] text-[var(--fg-3)] underline underline-offset-4 transition-colors hover:text-[var(--accent)]">Reset demo</button>
        </div>
        <div className="mt-5 flex items-start justify-between gap-3 border-t border-white/[0.07] pt-4">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider text-[var(--fg-4)]"><Zap size={12} className="text-[var(--accent)]" /> RECENT ACTIVITY</div>
          <span key={recent[0]} className="auction-activity-pop truncate text-right font-mono text-[10px] text-[var(--fg-3)]">{recent[0]}</span>
        </div>
      </div>
    </div>
  );
}
