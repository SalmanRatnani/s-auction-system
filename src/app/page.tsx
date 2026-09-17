import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Gavel, Wallet, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/branding/Logo";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-10 h-14 border-b border-[var(--line-1)]">
        <Logo href="/" />
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-[13px] text-[var(--fg-2)] hover:text-[var(--fg-1)] transition-colors duration-150"
          >
            Sign in
          </Link>
          <Link
            href="/login?mode=signup"
            className="text-[13px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-150"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex items-center px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[1180px] w-full mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-16 lg:gap-20 items-center">
          {/* Left — copy */}
          <div className="max-w-[520px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-1)] bg-[var(--bg-1)] px-2.5 py-1 text-[11px] text-[var(--fg-3)] animate-fade-up">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              Live auction platform
            </div>

            <h1 className="text-[36px] md:text-[48px] lg:text-[52px] font-semibold tracking-[-0.035em] leading-[1.08] mt-6 animate-fade-up delay-50">
              Real-time player
              <br />
              auctions for badminton.
            </h1>

            <p className="text-[15px] text-[var(--fg-3)] leading-relaxed mt-5 animate-fade-up delay-100">
              Live bidding, purse tracking, and instant roster updates across
              every screen — from the auctioneer&apos;s console to every
              captain in the room.
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-8 animate-fade-up delay-150">
              <Link
                href="/login"
                className="group inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[var(--accent)] text-[var(--accent-ink)] font-medium text-[13px] hover:bg-[var(--accent-hover)] transition-colors duration-150"
              >
                Sign in
                <ArrowRight
                  size={14}
                  strokeWidth={2}
                  className="transition-transform duration-150 group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/login?mode=signup"
                className="inline-flex items-center h-9 px-3.5 rounded-lg border border-[var(--line-2)] text-[var(--fg-1)] text-[13px] hover:bg-[var(--bg-2)] transition-colors duration-150"
              >
                Create account
              </Link>
            </div>

            {/* Small trust row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-10 text-[12px] text-[var(--fg-4)] animate-fade-up delay-200">
              <div className="flex items-center gap-1.5">
                <Gavel size={12} strokeWidth={2} />
                <span>Sub-second bids</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wallet size={12} strokeWidth={2} />
                <span>Live purse tracking</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Radio size={12} strokeWidth={2} />
                <span>Spectator links</span>
              </div>
            </div>
          </div>

          {/* Right — mock auction card */}
          <div className="animate-fade-up delay-150 hidden lg:block">
            <MockPlayerCard />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--line-1)] px-6 md:px-10 h-11 flex items-center justify-between text-[11px] text-[var(--fg-4)]">
        <span>S Auction System</span>
        <span>Badminton tournament platform</span>
      </footer>
    </main>
  );
}

/* ---------------------------------------------------------------------- */

function MockPlayerCard() {
  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-8 bg-[radial-gradient(ellipse_at_center,rgba(228,183,92,0.07),transparent_65%)] pointer-events-none" />

      <div className="relative rounded-xl border border-[var(--line-1)] bg-[var(--bg-1)] overflow-hidden shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)]">
        {/* Top bar — player + grade */}
        <div className="flex items-center gap-3 p-4 border-b border-[var(--line-1)]">
          <div className="h-11 w-11 rounded-md bg-[var(--bg-2)] border border-[var(--line-2)] grid place-items-center text-[11px] font-mono text-[var(--fg-4)]">
            SAS
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-[var(--fg-1)] truncate">
              Aarav Sharma
            </div>
            <div className="text-[10px] font-mono text-[var(--fg-4)]">
              SAS-2026-0042
            </div>
          </div>
          <span className="inline-flex items-center rounded-md border border-[var(--accent-line)] bg-[var(--accent-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
            A+
          </span>
        </div>

        {/* Bid panel */}
        <div className="p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
              Current bid
            </span>
            <span className="text-[11px] text-[var(--fg-4)] tabular-nums">
              #47
            </span>
          </div>

          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-[36px] font-semibold text-[var(--accent)] tnum leading-none">
              ₹1,45,000
            </span>
            <span className="text-[12px] text-[var(--success)]">
              ↑ +₹15,000
            </span>
          </div>

          <div className="flex items-center gap-2 mt-3 text-[12px] text-[var(--fg-3)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
            Leading: <span className="text-[var(--fg-1)]">Smash Kings</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="rounded-md border border-[var(--line-1)] bg-[var(--bg-0)] p-2.5">
              <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
                Base
              </div>
              <div className="text-[13px] font-medium text-[var(--fg-1)] tnum mt-0.5">
                ₹1L
              </div>
            </div>
            <div className="rounded-md border border-[var(--line-1)] bg-[var(--bg-0)] p-2.5">
              <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
                Increment
              </div>
              <div className="text-[13px] font-medium text-[var(--fg-1)] tnum mt-0.5">
                ₹5k
              </div>
            </div>
            <div className="rounded-md border border-[var(--line-1)] bg-[var(--bg-0)] p-2.5">
              <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
                Bids
              </div>
              <div className="text-[13px] font-medium text-[var(--fg-1)] tnum mt-0.5">
                47
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <div className="flex-1 h-9 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] text-[12px] font-medium grid place-items-center">
              Bid ₹1,50,000
            </div>
            <div className="h-9 px-3 rounded-md border border-[var(--line-2)] text-[12px] text-[var(--fg-2)] grid place-items-center">
              +2×
            </div>
          </div>
        </div>
      </div>

      {/* Teams strip below */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { name: "Smash Kings", purse: "₹42L", lead: true },
          { name: "Court Crew", purse: "₹68L" },
          { name: "Ace Squad", purse: "₹55L" },
        ].map((t) => (
          <div
            key={t.name}
            className={`rounded-md border p-2.5 ${
              t.lead
                ? "border-[var(--accent-line)] bg-[var(--accent-bg)]"
                : "border-[var(--line-1)] bg-[var(--bg-1)]"
            }`}
          >
            <div
              className={`text-[10px] uppercase tracking-[0.06em] truncate ${
                t.lead ? "text-[var(--accent)]" : "text-[var(--fg-4)]"
              }`}
            >
              {t.name}
            </div>
            <div
              className={`text-[12px] font-medium tnum mt-0.5 ${
                t.lead ? "text-[var(--accent)]" : "text-[var(--fg-1)]"
              }`}
            >
              {t.purse}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}