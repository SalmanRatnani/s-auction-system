"use client";
import { useReducer, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  RotateCcw,
  Check,
  Gavel,
  Info,
  Pause,
  Play,
  Radio,
  Users,
  Home,
} from "lucide-react";
import { ThemePicker } from "@/components/theme/ThemePicker";
import { QuickNavigation } from "@/components/layout/QuickNavigation";
import { Logo } from "@/components/branding/Logo";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { SoldCelebration } from "@/components/auction/SoldCelebration";
import { PurseMeter } from "@/components/auction/PurseMeter";
import { TeamLogo } from "@/components/branding/TeamLogo";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { AnimatedAmount } from "@/components/ui/animated-amount";
import { DemoActivity } from "./DemoActivity";
import {
  createDemoState,
  demoReducer,
  nextDemoBid,
  DEMO_BASE_PRICE,
  DEMO_PURSE,
  DEMO_TEAMS,
  type DemoRole,
  type DemoAction,
} from "./demo-state";

const ROLES = ["Captain", "Auctioneer", "Spectator"] as const;
const ROLE_DETAILS = {
  Captain:
    "Make the opening bid, then follow the competition. Each sample bid rotates the leading team.",
  Auctioneer:
    "Set the pace. Pause the room, simulate a bid, then confirm the sale.",
  Spectator:
    "Follow the player, leading team and room activity. Simulate an update to see it in motion.",
};
const PLAYER = {
  id: "demo-player",
  player_code: "SAMPLE 042",
  name: "Aarav Sharma",
  grade: "A+",
  image_url: null,
  playing_hand: "Right",
  playing_centre: "Mumbai",
  achievements:
    "A sample profile. Registered players’ photos, grades and highlights appear here on auction day.",
};

export function DemoRoom({
  initialRole = "Captain",
}: {
  initialRole?: DemoRole;
}) {
  const [role, setRole] = useState<DemoRole>(initialRole);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const sequence = useRef(0);
  const [state, dispatch] = useReducer(demoReducer, undefined, createDemoState);
  const bid = state.bids[0] ?? null;
  const team = DEMO_TEAMS.find((item) => item.id === bid?.team_id);
  const sold = state.status === "sold";
  const paused = state.status === "paused";
  const nextAmount = nextDemoBid(state);
  const saleEvent = sold
    ? state.events.find((event) => event.kind === "sell")
    : null;
  const phase = sold ? 2 : state.bids.length ? 1 : 0;
  function act(type: Exclude<DemoAction["type"], "reset">) {
    dispatch({
      type,
      id: `demo-event-${++sequence.current}`,
      at: new Date().toISOString(),
    });
  }
  function resetDemo() {
    dispatch({ type: "reset" });
    setCelebrationKey((value) => value + 1);
  }
  const message = sold
    ? "Sale complete. Reset the demo to start again."
    : paused
      ? "Bidding is paused. Resume from the Auctioneer perspective."
      : nextAmount === null
        ? "Sample purse limit reached. Switch to Auctioneer to confirm the sale."
        : bid
          ? `Sample bid accepted. ${team?.name} leads at ${formatINR(bid.amount)}.`
          : "Ready for the opening bid. No real auction data is affected.";

  return (
    <div className="demo-shell space-y-7">
      <SoldCelebration
        key={celebrationKey}
        lastSale={
          saleEvent && bid && team
            ? {
                id: saleEvent.id,
                price: bid.amount,
                acquired_via: "AUCTION",
                won_at: saleEvent.at,
                player_name: PLAYER.name,
                grade: PLAYER.grade,
                image_url: null,
                team_name: team.name,
              }
            : null
        }
      />
      <header className="flex items-center justify-between gap-4">
        <Logo href="/" />
        <div className="demo-header-tools flex items-center gap-2">
          <QuickNavigation
            items={[
              {
                id: "captain",
                label: "Captain perspective",
                description: "Try sample bidding",
                icon: Users,
                onSelect: () => setRole("Captain"),
              },
              {
                id: "auctioneer",
                label: "Auctioneer perspective",
                description: "Pause the room and confirm a sample sale",
                icon: Gavel,
                onSelect: () => setRole("Auctioneer"),
              },
              {
                id: "spectator",
                label: "Spectator perspective",
                description: "Follow the sample room",
                icon: Radio,
                onSelect: () => setRole("Spectator"),
              },
              {
                id: "home",
                label: "Back to homepage",
                description: "Explore S Auction",
                icon: Home,
                href: "/",
              },
            ]}
          />
          <ThemePicker />
          <Link href="/login" className="arena-button">
            Sign in <ArrowUpRight size={17} />
          </Link>
        </div>
      </header>
      <div className="demo-intro-note">
        <Info size={17} aria-hidden="true" />
        <p>
          <strong>Interactive demo.</strong> Fictional players, teams and
          virtual credits. Changes stay on this page and reset on reload.
        </p>
      </div>
      <div className="demo-title-row animate-fade-up">
        <div>
          <span className="eyebrow">STEP INTO THE ARENA</span>
          <h1 className="dashboard-title mt-3">Your seat. Your next move.</h1>
          <p>Try every perspective. Feel the room come alive.</p>
        </div>
        <button
          type="button"
          className="demo-reset"
          onClick={resetDemo}
        >
          <RotateCcw size={15} />
          Reset demo
        </button>
      </div>
      <div className="demo-room-toolbar">
        <div
          className="demo-tabs"
          role="tablist"
          aria-label="Demo perspective"
          style={{ "--tab-index": ROLES.indexOf(role) } as CSSProperties}
        >
          {ROLES.map((item, index) => (
            <button
              key={item}
              type="button"
              ref={(node) => {
                tabs.current[index] = node;
              }}
              id={`demo-tab-${item.toLowerCase()}`}
              role="tab"
              aria-controls="demo-perspective-panel"
              aria-selected={role === item}
              tabIndex={role === item ? 0 : -1}
              onClick={() => setRole(item)}
              onKeyDown={(event) => {
                const next =
                  event.key === "ArrowRight"
                    ? (index + 1) % ROLES.length
                    : event.key === "ArrowLeft"
                      ? (index + ROLES.length - 1) % ROLES.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? ROLES.length - 1
                          : null;
                if (next === null) return;
                event.preventDefault();
                setRole(ROLES[next]);
                tabs.current[next]?.focus();
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <span className="room-status" data-status={state.status}>
          <span aria-hidden="true" />
          {sold
            ? "Sale complete"
            : paused
              ? "Room paused"
              : "Open for sample bids"}
        </span>
      </div>
      <div className="demo-stage-grid">
        <div className="demo-stage-main">
          <ol className="demo-journey" aria-label="Sample auction progress">
            {["Player ready", "Bidding open", "Sale confirmed"].map(
              (step, index) => (
                <li
                  key={step}
                  data-complete={phase > index}
                  aria-current={phase === index ? "step" : undefined}
                >
                  <span aria-hidden="true">
                    {phase > index ? <Check size={12} /> : `0${index + 1}`}
                  </span>
                  {step}
                </li>
              ),
            )}
          </ol>
          <PlayerOnBlock
            player={PLAYER}
            basePrice={DEMO_BASE_PRICE}
            currentBid={bid?.amount ?? null}
            highestBid={bid}
            teams={DEMO_TEAMS}
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
            {sold && bid && team ? (
              <div className="demo-sale">
                <span className="sale-check">
                  <Check size={22} />
                </span>
                <div>
                  <span>THE NEXT CHAPTER STARTS HERE</span>
                  <h2>
                    {PLAYER.name} joins {team.name}.
                  </h2>
                  <p>
                    {formatINR(bid.amount)} in virtual credits · sample sale
                    confirmed
                  </p>
                </div>
              </div>
            ) : (
              <div
                key={`controls-${role}`}
                className="demo-controls motion-panel flex gap-3 items-center flex-wrap"
              >
                {role === "Captain" && (
                  <Button
                    size="lg"
                    onClick={() => act("bid")}
                    disabled={nextAmount === null}
                  >
                    <Gavel size={17} />
                    {paused
                      ? "Bidding paused"
                      : nextAmount === null
                        ? "Purse limit reached"
                        : `${bid ? "Place sample bid" : "Place opening bid"} · ${formatINR(nextAmount)}`}
                  </Button>
                )}
                {role === "Auctioneer" && (
                  <>
                    <Button
                      onClick={() => act("sell")}
                      disabled={!bid || paused}
                    >
                      <Check size={16} />
                      Confirm sample sale
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => act("bid")}
                      disabled={nextAmount === null}
                    >
                      Simulate incoming bid
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => act(paused ? "resume" : "pause")}
                    >
                      {paused ? <Play size={15} /> : <Pause size={15} />}
                      {paused ? "Resume demo" : "Pause demo"}
                    </Button>
                  </>
                )}
                {role === "Spectator" && (
                  <Button
                    variant="outline"
                    onClick={() => act("bid")}
                    disabled={nextAmount === null}
                  >
                    <Radio size={16} />
                    Simulate next update
                  </Button>
                )}
                {(paused || nextAmount === null) && role !== "Auctioneer" && (
                  <button
                    type="button"
                    className="demo-role-link"
                    onClick={() => setRole("Auctioneer")}
                  >
                    Open auctioneer controls <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
            )}
            <p className="demo-feedback" role="status" aria-atomic="true">
              {message}
            </p>
          </section>
        </div>
        <DemoActivity events={state.events} />
      </div>
      <section aria-labelledby="demo-teams-title">
        <div className="demo-section-heading">
          <div>
            <span className="eyebrow">THE SQUADS BEHIND THE BIDS</span>
            <h2 id="demo-teams-title">Team purses</h2>
          </div>
          <span>
            {state.bids.length} sample{" "}
            {state.bids.length === 1 ? "bid" : "bids"}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 stagger-enter">
          {DEMO_TEAMS.map((item) => {
            const won = sold && item.id === team?.id;
            const remaining = DEMO_PURSE - (won && bid ? bid.amount : 0);
            return (
              <div
                key={item.id}
                className="stat-tile demo-team-tile"
                data-leading={item.id === team?.id}
              >
                <div>
                  <TeamLogo name={item.name} />
                  <span className="demo-team-state">
                    {won
                      ? "PLAYER SECURED"
                      : item.id === team?.id
                        ? "LEADING BID"
                        : "READY TO COMPETE"}
                  </span>
                </div>
                <h3 className="text-lg mt-5">{item.name}</h3>
                <strong className="!text-2xl text-[var(--accent)]">
                  <AnimatedAmount value={remaining} compact={false} />
                </strong>
                <small>
                  {won ? "1 player secured" : "0 players secured"} · virtual
                  credits
                </small>
                <PurseMeter
                  available={remaining}
                  total={DEMO_PURSE}
                  label={`${item.name} remaining purse`}
                />
              </div>
            );
          })}
        </div>
      </section>
      <p className="text-xs text-[var(--fg-3)] leading-6 border-t border-[var(--line-2)] pt-6">
        Demo bids rotate between sample teams. Purses change only when a sale is
        confirmed. In your real auction, role permissions, bid validation and
        purse changes are enforced by the backend.
      </p>
    </div>
  );
}
