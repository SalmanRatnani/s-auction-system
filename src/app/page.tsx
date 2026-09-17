import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Zap, Wallet, Radio, type LucideIcon } from "lucide-react";
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
      <nav className="flex items-center justify-between px-6 md:px-10 h-16 border-b border-[var(--line-1)]">
        <Logo href="/" />
        <Link
          href="/login"
          className="text-[13px] text-[var(--fg-2)] hover:text-[var(--fg-1)] transition-colors duration-150"
        >
          Sign in →
        </Link>
      </nav>

      {/* Hero */}
      <div className="flex-1 grid place-items-center px-6 py-20">
        <div className="max-w-[720px] w-full">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-1)] bg-[var(--bg-1)] px-3 py-1 text-[11px] text-[var(--fg-3)] tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              Live now
            </div>
          </div>

          <h1 className="text-[44px] md:text-[64px] font-semibold tracking-[-0.03em] leading-[1.05] mt-8 animate-fade-up delay-50">
            Real-time player
            <br />
            auctions for badminton.
          </h1>

          <p className="text-[16px] md:text-[17px] text-[var(--fg-3)] leading-relaxed mt-6 max-w-[560px] animate-fade-up delay-100">
            A bidding platform built for tournament drafts — live purse tracking,
            instant updates across every screen, and spectator access from any device.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-10 animate-fade-up delay-150">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[var(--accent)] text-[var(--accent-ink)] font-medium text-sm hover:bg-[var(--accent-hover)] transition-colors duration-150"
            >
              Sign in
              <ArrowRight
                size={15}
                strokeWidth={2}
                className="transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center h-10 px-4 rounded-lg border border-[var(--line-2)] text-[var(--fg-1)] text-sm hover:bg-[var(--bg-2)] transition-colors duration-150"
            >
              Create account
            </Link>
          </div>

          {/* Feature row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px mt-20 border border-[var(--line-1)] rounded-xl overflow-hidden bg-[var(--line-1)] animate-fade-up delay-200">
            <Feature
              icon={Zap}
              title="Realtime bidding"
              desc="Sub-second updates across every device."
            />
            <Feature
              icon={Wallet}
              title="Purse tracking"
              desc="Live budget control for every captain."
            />
            <Feature
              icon={Radio}
              title="Spectator access"
              desc="Public links and projector view."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--line-1)] px-6 md:px-10 h-12 flex items-center justify-between text-[11px] text-[var(--fg-4)]">
        <span>S Auction System</span>
        <span>Badminton tournament platform</span>
      </footer>
    </main>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-[var(--bg-0)] p-5">
      <Icon size={16} strokeWidth={1.75} className="text-[var(--accent)]" />
      <div className="text-[13px] font-medium text-[var(--fg-1)] mt-3">{title}</div>
      <div className="text-[12px] text-[var(--fg-3)] mt-1 leading-relaxed">{desc}</div>
    </div>
  );
}