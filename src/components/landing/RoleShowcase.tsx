"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Gavel,
  Monitor,
  ShieldCheck,
  Users,
} from "lucide-react";
import { TeamLogo } from "@/components/branding/TeamLogo";

const roles = [
  {
    name: "Organizers",
    icon: ShieldCheck,
    title: "The whole event. Under control.",
    copy: "Prepare the lineup, assign the right access and keep a clear view of your tournament.",
    features: [
      "Review player registrations",
      "Assign roles and team captains",
      "Manage purses and event settings",
    ],
    workspace: "Event overview",
    stat: "6",
    statLabel: "SAMPLE TEAMS",
    detail: "Ready for auction day",
    rows: ["Player lineup", "Team captains", "Role permissions"],
    values: ["36 registered", "6 assigned", "4 perspectives"],
    view: "auctioneer",
    cta: "Explore the auctioneer demo",
  },
  {
    name: "Auctioneers",
    icon: Gavel,
    title: "Set the pace. Own the moment.",
    copy: "Draw the next player, follow the leading bid and make the final call from one focused console.",
    features: [
      "Draw players by category",
      "Pause and resume the room",
      "Confirm sales and manage retries",
    ],
    workspace: "Auction console",
    stat: "₹1,45,000",
    statLabel: "SAMPLE LEADING BID",
    detail: "Aarav Sharma · A+",
    rows: ["Leading team", "Round", "Room status"],
    values: ["Smash Kings", "Round 1", "Open for bids"],
    view: "auctioneer",
    cta: "Explore the auctioneer demo",
  },
  {
    name: "Captains",
    icon: Users,
    title: "See your next winning move.",
    copy: "Keep the current player, bidding allowance and team position in view when it matters most.",
    features: [
      "Follow your available purse",
      "See the leading team instantly",
      "Bid with category and reserve checks",
    ],
    workspace: "Your bidding desk",
    stat: "₹4,00,000",
    statLabel: "SAMPLE BIDDING ALLOWANCE",
    detail: "Smash Kings · Captain perspective",
    rows: ["Virtual purse", "Captain reserves", "Available to bid"],
    values: ["₹5,00,000", "₹1,00,000", "₹4,00,000"],
    view: "captain",
    cta: "Explore the captain demo",
  },
  {
    name: "Spectators",
    icon: Monitor,
    title: "Every bid. A front-row seat.",
    copy: "Follow the player, the leading team and the final sale from a viewer link or the venue screen.",
    features: [
      "Follow the room as bids arrive",
      "Explore teams and their rosters",
      "Bring the action to the big screen",
    ],
    workspace: "Live audience view",
    stat: "Aarav Sharma",
    statLabel: "SAMPLE PLAYER ON THE BLOCK",
    detail: "A+ · Men’s singles",
    rows: ["Current bid", "Leading team", "Perspective"],
    values: ["₹1,45,000", "Smash Kings", "View only"],
    view: "spectator",
    cta: "Explore the spectator demo",
  },
] as const;

export function RoleShowcase() {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const role = roles[selected];
  const Icon = role.icon;
  return (
    <div className="role-showcase">
      <div
        className="role-selector"
        role="tablist"
        aria-label="Explore auction roles"
      >
        {roles.map((item, index) => {
          const TabIcon = item.icon;
          return (
            <button
              type="button"
              role="tab"
              key={item.name}
              id={`${id}-tab-${index}`}
              aria-controls={`${id}-panel`}
              aria-selected={selected === index}
              tabIndex={selected === index ? 0 : -1}
              ref={(node) => {
                tabs.current[index] = node;
              }}
              onClick={() => setSelected(index)}
              onKeyDown={(event) => {
                const next =
                  event.key === "ArrowRight"
                    ? (index + 1) % roles.length
                    : event.key === "ArrowLeft"
                      ? (index + roles.length - 1) % roles.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? roles.length - 1
                          : null;
                if (next === null) return;
                event.preventDefault();
                setSelected(next);
                tabs.current[next]?.focus();
              }}
            >
              <TabIcon size={18} aria-hidden="true" />
              <span>{item.name}</span>
              <small>0{index + 1}</small>
            </button>
          );
        })}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${selected}`}
        tabIndex={0}
      >
        <div key={role.name} className="role-stage motion-panel">
          <div className="role-story">
            <span className="eyebrow">YOUR SEAT IN THE ARENA</span>
            <h3>{role.title}</h3>
            <p>{role.copy}</p>
            <ul>
              {role.features.map((feature) => (
                <li key={feature}>
                  <Check size={15} aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              className="marketing-secondary"
              href={`/demo?view=${role.view}`}
            >
              {role.cta}
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div
            className="role-workspace"
            aria-label={`${role.name} sample workspace`}
          >
            <header>
              <span>
                <Icon size={17} aria-hidden="true" />
                {role.workspace}
              </span>
              <small>DEMO</small>
            </header>
            <div className="role-workspace-main">
              <span className="eyebrow">{role.statLabel}</span>
              <strong>{role.stat}</strong>
              <p>{role.detail}</p>
            </div>
            <dl>
              {role.rows.map((label, index) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{role.values[index]}</dd>
                </div>
              ))}
            </dl>
            <footer>
              <div className="role-team-marks" aria-hidden="true">
                <TeamLogo name="Smash Kings" />
                <TeamLogo name="Net Ninjas" />
                <TeamLogo name="Court Titans" />
              </div>
              <span>One room. Connected perspectives.</span>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
