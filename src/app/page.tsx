import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
        <Link
          href="/login"
          className="text-[13px] text-[var(--fg-2)] hover:text-[var(--fg-1)] transition-colors duration-150"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex items-center px-6 md:px-10 py-16">
        <div className="max-w-[640px] w-full">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-1)] bg-[var(--bg-1)] px-2.5 py-1 text-[11px] text-[var(--fg-3)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              Live auction platform
            </div>
          </div>

          <h1 className="text-[40px] md:text-[56px] font-semibold tracking-[-0.03em] leading-[1.05] mt-6 animate-fade-up delay-50">
            Real-time player auctions,
            <br />
            built for the tournament floor.
          </h1>

          <p className="text-[15px] text-[var(--fg-3)] leading-relaxed mt-5 max-w-[520px] animate-fade-up delay-100">
            Live bidding, purse tracking, and instant roster updates across
            every screen — from the auctioneer&apos;s console to every captain
            in the room.
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