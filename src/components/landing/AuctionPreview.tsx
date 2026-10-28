"use client";

import { useState } from "react";
import { ArrowUpRight, Gavel, RotateCcw, TrendingUp } from "lucide-react";
import { TeamLogo } from "@/components/branding/TeamLogo";
import { DepthSurface } from "@/components/motion/DepthSurface";

const TEAMS = ["Smash Kings", "Net Ninjas", "Court Titans"];
const money = new Intl.NumberFormat("en-IN");

export function AuctionPreview() {
  const [bids, setBids] = useState(0);
  const bid = 145000 + bids * 5000;
  const team = TEAMS[bids % TEAMS.length];
  return (
    <DepthSurface>
      <div
        className="arena-preview arena-preview-compact"
        aria-label="Interactive sample auction"
      >
        <div className="preview-toolbar">
          <span>
            <span className="live-dot" /> THE AUCTION ROOM
          </span>
          <span className="preview-demo-tag">DEMO</span>
        </div>
        <div className="preview-summary">
          <div className="preview-player-info">
            <span className="eyebrow">ON THE BLOCK / 042</span>
            <h3>
              Aarav Sharma<span>.</span>
            </h3>
            <span className="grade-chip">
              A+ <span>MEN’S SINGLES</span>
            </span>
          </div>
          <div className="preview-bid">
            <span className="eyebrow">CURRENT BID</span>
            <div
              className="preview-amount"
              aria-live="polite"
              aria-atomic="true"
            >
              <span key={bids} className={bids ? "amount-update" : undefined}>
                ₹{money.format(bid)}
              </span>
              <small>VIRTUAL CREDITS</small>
            </div>
          </div>
        </div>
        <div className="preview-leader">
          <span
            key={`crest-${team}`}
            className="preview-crest animate-scale-in"
          >
            <TeamLogo name={team} />
          </span>
          <div key={team} className="animate-fade-in">
            <small>LEADING TEAM</small>
            <strong>{team}</strong>
          </div>
          <span className="preview-increment">
            <TrendingUp size={13} /> +5,000 / bid
          </span>
        </div>
        <div className="preview-actions">
          <button
            className="arena-button"
            onClick={() => setBids((n) => n + 1)}
          >
            <span key={bids} className={bids ? "bid-gavel" : undefined}>
              <Gavel size={18} />
            </span>{" "}
            Place a demo bid <ArrowUpRight size={19} />
          </button>
          <button
            className="preview-reset"
            aria-label="Reset demo bids"
            onClick={() => setBids(0)}
          >
            <RotateCcw size={17} />
          </button>
        </div>
        <p className="preview-note">
          Try it. These sample bids stay in your browser.
        </p>
      </div>
    </DepthSurface>
  );
}
