import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandingSplash } from "./LandingSplash";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <>
      <LandingSplash />
      <main className="min-h-screen flex flex-col">
        {/* Nav */}
        <nav className="flex items-center justify-between p-6 md:px-12 animate-slide-down">
          <div className="flex items-center gap-2">
            <span className="text-3xl animate-float">🏸</span>
            <span className="text-lg font-display font-black tracking-tight">
              S Auction <span className="text-emerald-400">System</span>
            </span>
          </div>
          <Link
            href="/login"
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            Sign in →
          </Link>
        </nav>

        {/* Hero */}
        <div className="flex-1 grid place-items-center px-6 py-12 md:py-20">
          <div className="max-w-4xl text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs text-emerald-300 animate-slide-up">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live auction platform
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight leading-[1.05] animate-slide-up delay-100">
              The <span className="text-gradient">S Auction System</span>{" "}
              for badminton
            </h1>

            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed animate-slide-up delay-200">
              Real-time bidding, live purse tracking, and instant roster updates.
              Built for tournaments that move fast.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 animate-slide-up delay-300">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold px-6 py-3.5 shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-400/40 hover:scale-[1.02]"
              >
                Sign in
                <span className="text-base transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <Link
                href="/login?mode=signup"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 hover:bg-white/5 px-6 py-3.5 text-white transition-colors"
              >
                Create account
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-16 max-w-3xl mx-auto animate-slide-up delay-500">
              <Feature
                icon="⚡"
                title="Realtime bidding"
                desc="Every bid lands instantly on every screen."
              />
              <Feature
                icon="💰"
                title="Live purse tracking"
                desc="Captains see spend and remaining, updated in real time."
              />
              <Feature
                icon="🎙️"
                title="Auctioneer control"
                desc="Draw, sell, undo, pause — full control."
              />
            </div>
          </div>
        </div>

        <footer className="p-6 md:px-12 text-center text-xs text-white/30 animate-fade-in delay-700">
          S Auction System · Badminton player auction platform
        </footer>
      </main>
    </>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="surface surface-hover p-5 text-left">
      <div className="text-2xl mb-3">{icon}</div>
      <div className="font-semibold text-white">{title}</div>
      <div className="text-sm text-white/50 mt-1 leading-relaxed">{desc}</div>
    </div>
  );
}