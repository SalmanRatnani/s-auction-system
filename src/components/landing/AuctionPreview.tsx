"use client";

import { useState } from "react";
import { ArrowUpRight, Gavel, RotateCcw, TrendingUp } from "lucide-react";
import { TeamLogo } from "@/components/branding/TeamLogo";

const TEAMS = ["Smash Kings", "Net Ninjas", "Court Titans"];
const money = new Intl.NumberFormat("en-IN");

export function AuctionPreview() {
  const [bids, setBids] = useState(0);
  const bid = 145000 + bids * 5000;
  const team = TEAMS[bids % TEAMS.length];
  return (
    <div className="arena-preview" aria-label="Interactive sample auction">
      <div className="preview-toolbar">
        <span>
          <span className="live-dot" /> THE AUCTION ROOM
        </span>
        <span className="preview-demo-tag">DEMO</span>
      </div>
      <div className="preview-player">
        <div className="preview-player-art" aria-hidden="true">
          <svg viewBox="0 0 240 240" fill="none">
            <circle
              cx="120"
              cy="120"
              r="94"
              stroke="currentColor"
              strokeOpacity=".25"
            />
            <circle
              cx="120"
              cy="120"
              r="73"
              stroke="currentColor"
              strokeOpacity=".15"
              strokeDasharray="3 7"
            />
            <g transform="rotate(32 120 120)">
              <ellipse
                cx="120"
                cy="86"
                rx="42"
                ry="53"
                stroke="currentColor"
                strokeWidth="5"
              />
              <path
                d="M91 48v76m14-85v96m15-102v106m15-100v96m14-87v76M80 66h80M78 82h84M80 98h80m-74 16h68"
                stroke="currentColor"
                strokeOpacity=".4"
              />
              <path d="M120 139v49" stroke="currentColor" strokeWidth="5" />
              <path
                d="M120 184v39"
                stroke="currentColor"
                strokeWidth="11"
                strokeLinecap="round"
              />
            </g>
            <path
              d="m180 157 27 5-14 23-12-6-1-22Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="m183 179 7 4-4 6-6-4 3-6Z" fill="currentColor" />
          </svg>
          <span>PLAYER / 042</span>
        </div>
        <div className="preview-player-info">
          <span className="eyebrow">ON THE BLOCK</span>
          <h3>
            Aarav
            <br />
            Sharma<span>.</span>
          </h3>
          <span className="grade-chip">
            A+ <span>MEN’S SINGLES</span>
          </span>
          <p>Right-handed · Mumbai</p>
        </div>
      </div>
      <div className="preview-bid">
        <div className="flex items-center justify-between">
          <span className="eyebrow">CURRENT BID</span>
          <span className="preview-increment">
            <TrendingUp size={13} /> +5,000
          </span>
        </div>
        <div className="preview-amount" aria-live="polite" aria-atomic="true">
          ₹{money.format(bid)}
          <small>VIRTUAL CREDITS</small>
        </div>
        <div className="preview-leader">
          <TeamLogo name={team} />
          <div>
            <small>LEADING TEAM</small>
            <strong>{team}</strong>
          </div>
          <span>{12 + bids} bids</span>
        </div>
      </div>
      <div className="preview-actions">
        <button className="arena-button" onClick={() => setBids((n) => n + 1)}>
          <Gavel size={18} /> Place a demo bid <ArrowUpRight size={19} />
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
  );
}
