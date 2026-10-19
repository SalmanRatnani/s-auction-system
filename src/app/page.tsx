import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, ArrowUpRight, AudioLines, Check, CircleDot, Gavel,
  Layers3, Radio, ShieldCheck, Sparkles, Trophy, Users, Wallet, Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/branding/Logo";
import { AuctionPreview } from "@/components/landing/AuctionPreview";
import { Reveal } from "@/components/landing/Reveal";

const features = [
  { number: "01", icon: Zap, title: "Every bid. In sync.", description: "From the auctioneer's podium to every captain's screen, the action stays connected in real time." },
  { number: "02", icon: Wallet, title: "Purses, perfectly clear.", description: "See budgets, winning bids and team compositions in one beautifully simple workspace." },
  { number: "03", icon: Radio, title: "Bring everyone courtside.", description: "Give your audience a front-row view with live spectator and big-screen projector experiences." },
];

const roles = [
  { icon: Gavel, title: "Auctioneers", desc: "Command the room.", tag: "RUN THE SHOW" },
  { icon: Trophy, title: "Team captains", desc: "Build a winning squad.", tag: "MAKE YOUR MOVE" },
  { icon: Users, title: "Organizers", desc: "Own every detail.", tag: "STAY IN CONTROL" },
  { icon: AudioLines, title: "Spectators", desc: "Feel every moment.", tag: "WATCH IT UNFOLD" },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="landing-page min-h-screen overflow-hidden">
      <div aria-hidden="true" className="landing-ambient" />
      <div aria-hidden="true" className="landing-grain" />
      <nav className="landing-nav relative z-20 mx-auto flex h-[84px] max-w-[1320px] items-center justify-between px-6 md:px-10">
        <Logo href="/" />
        <div className="hidden items-center gap-9 md:flex">
          <a href="#experience" className="landing-nav-link">The experience</a>
          <a href="#features" className="landing-nav-link">Features</a>
          <a href="#roles" className="landing-nav-link">Who it's for</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="landing-nav-link hidden sm:block">Log in</Link>
          <Link href="/login?mode=signup" className="landing-nav-cta group">
            Enter the arena <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </nav>

      <section id="experience" className="relative mx-auto grid min-h-[730px] max-w-[1320px] items-center gap-14 px-6 pb-24 pt-14 md:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8 lg:pb-28 lg:pt-20">
        <div className="relative z-10 max-w-[630px]">
          <div className="landing-eyebrow hero-enter">
            <span className="landing-status-dot" />
            THE NEXT ERA OF BADMINTON AUCTIONS
            <ArrowUpRight size={13} className="opacity-60" />
          </div>
          <h1 className="landing-hero-title hero-enter hero-delay-1">
            Every bid<br />
            has <span className="landing-hero-accent">a moment.</span><br />
            Make it count.
          </h1>
          <p className="hero-enter hero-delay-2 mt-7 max-w-[505px] text-[16px] leading-[1.85] text-[var(--fg-2)] md:text-[18px]">
            The modern command center for badminton player auctions.
            Bring the energy of a live arena to every bid, every team,
            and every unforgettable winning moment.
          </p>
          <div className="hero-enter hero-delay-3 mt-9 flex flex-wrap items-center gap-4">
            <Link href="/login?mode=signup" className="landing-primary-cta group">
              Get started <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#features" className="landing-text-cta group">
              Explore the experience
              <span className="grid h-8 w-8 place-items-center rounded-full border border-white/15 transition-transform group-hover:translate-y-1">
                <ArrowRight size={14} className="rotate-90" />
              </span>
            </a>
          </div>
          <div className="hero-enter hero-delay-4 mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/10 pt-7">
            <span className="flex items-center gap-2 text-[12px] text-[var(--fg-3)]"><Check size={15} className="text-[var(--accent)]" /> Real-time bidding</span>
            <span className="flex items-center gap-2 text-[12px] text-[var(--fg-3)]"><Check size={15} className="text-[var(--accent)]" /> Role-based controls</span>
            <span className="flex items-center gap-2 text-[12px] text-[var(--fg-3)]"><Check size={15} className="text-[var(--accent)]" /> Built for the big screen</span>
          </div>
        </div>

        <div className="hero-enter hero-delay-2 relative z-10 min-w-0">
          <div className="landing-showcase-halo" aria-hidden="true" />
          <AuctionPreview />
          <div className="landing-float-label landing-float-label-left hidden xl:flex">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--success-bg)] text-[var(--success)]"><ShieldCheck size={17} /></span>
            <div><strong>Instant updates</strong><small>Every screen, one arena</small></div>
          </div>
        </div>
        <div aria-hidden="true" className="landing-court-lines" />
      </section>

      <div className="landing-ticker" aria-label="Platform highlights">
        <div className="landing-ticker-inner">
          {Array.from({ length: 2 }).map((_, repetition) => (
            <div key={repetition} className="flex shrink-0 items-center gap-12 pr-12" aria-hidden={repetition === 1}>
              <span>THE THRILL OF THE BID</span><Sparkles size={16} />
              <span>THE POWER OF THE TEAM</span><Sparkles size={16} />
              <span>THE ENERGY OF THE ARENA</span><Sparkles size={16} />
            </div>
          ))}
        </div>
      </div>

      <section id="features" className="landing-section mx-auto max-w-[1320px] px-6 py-28 md:px-10 md:py-36">
        <Reveal>
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-[680px]">
              <div className="landing-section-kicker"><CircleDot size={13} /> BUILT FOR THE MOMENT</div>
              <h2 className="landing-section-title mt-5">Everything you need.<br /><span className="text-[var(--fg-3)]">Nothing in your way.</span></h2>
            </div>
            <p className="max-w-[320px] text-[14px] leading-7 text-[var(--fg-3)]">
              Designed to make complex tournament-day operations feel effortless.
            </p>
          </div>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.number} delay={index * 100}>
                <article className="landing-feature-card group h-full">
                  <div className="mb-20 flex items-start justify-between">
                    <span className="landing-feature-icon"><Icon size={22} strokeWidth={1.6} /></span>
                    <span className="font-mono text-[11px] tracking-wider text-[var(--fg-4)]">{feature.number} / 03</span>
                  </div>
                  <h3 className="text-[23px] font-semibold tracking-[-0.035em]">{feature.title}</h3>
                  <p className="mt-4 max-w-[300px] text-[14px] leading-7 text-[var(--fg-3)]">{feature.description}</p>
                  <div className="mt-8 h-px w-full bg-white/10 transition-colors group-hover:bg-[var(--accent-line)]" />
                  <ArrowUpRight size={18} className="mt-5 text-[var(--fg-4)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[var(--accent)]" />
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="landing-spotlight relative overflow-hidden border-y border-white/[0.07]">
        <div className="mx-auto grid max-w-[1320px] items-center gap-16 px-6 py-24 md:px-10 lg:grid-cols-2 lg:py-32">
          <Reveal>
            <div className="landing-section-kicker"><Layers3 size={13} /> ONE SEAMLESS PLATFORM</div>
            <h2 className="landing-section-title mt-6">From first call<br />to <em className="landing-hero-accent not-italic">final hammer.</em></h2>
            <p className="mt-7 max-w-[470px] text-[15px] leading-8 text-[var(--fg-2)]">
              One place to prepare players, manage teams, set the rules and run the live auction.
              Everyone stays on the same page, even when the room gets loud.
            </p>
            <Link href="/login?mode=signup" className="landing-text-cta group mt-8 inline-flex">
              Start your auction <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <div className="landing-process-card">
              {[
                { number: "01", title: "Set the stage", text: "Organize players, grades and teams." },
                { number: "02", title: "Open the floor", text: "Connect auctioneers, captains and viewers." },
                { number: "03", title: "Let the bids fly", text: "Follow every bid and winning team in real time." },
              ].map((step, index) => (
                <div key={step.number} className="relative flex gap-5 pb-9 last:pb-0">
                  {index < 2 && <div className="absolute left-[21px] top-[50px] h-[calc(100%-52px)] w-px bg-gradient-to-b from-[var(--accent-line)] to-transparent" />}
                  <div className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--accent-line)] bg-[var(--accent-bg)] font-mono text-[12px] text-[var(--accent)]">{step.number}</div>
                  <div className="pt-0.5"><h3 className="text-[19px] font-medium">{step.title}</h3><p className="mt-2 text-[13px] leading-6 text-[var(--fg-3)]">{step.text}</p></div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section id="roles" className="mx-auto max-w-[1320px] px-6 py-28 md:px-10 md:py-36">
        <Reveal>
          <div className="landing-section-kicker"><Users size={13} /> MADE FOR EVERY SEAT</div>
          <h2 className="landing-section-title mt-5">One arena.<br /><span className="text-[var(--fg-3)]">Everyone connected.</span></h2>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <Reveal key={role.title} delay={index * 80}>
                <div className="landing-role-card group h-full">
                  <div className="flex items-center justify-between"><Icon size={23} className="text-[var(--accent)]" strokeWidth={1.6} /><ArrowUpRight size={17} className="text-[var(--fg-4)] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></div>
                  <div className="mt-16 font-mono text-[10px] tracking-[0.17em] text-[var(--fg-4)]">{role.tag}</div>
                  <h3 className="mt-3 text-[21px] font-semibold">{role.title}</h3>
                  <p className="mt-2 text-[13px] text-[var(--fg-3)]">{role.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="px-6 pb-24 md:px-10">
        <Reveal>
          <div className="landing-final-cta relative mx-auto max-w-[1240px] overflow-hidden px-7 py-16 text-center md:py-24">
            <div className="landing-section-kicker justify-center"><Sparkles size={14} /> YOUR NEXT AUCTION STARTS HERE</div>
            <h2 className="landing-section-title mx-auto mt-6 max-w-[740px]">Ready to bring the<br /><span className="landing-hero-accent">arena to life?</span></h2>
            <p className="mx-auto mt-5 max-w-[440px] text-[14px] leading-7 text-[var(--fg-2)]">Less admin. More action. Make your next badminton auction one to remember.</p>
            <Link href="/login?mode=signup" className="landing-primary-cta group mt-9 inline-flex">Enter the arena <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></Link>
          </div>
        </Reveal>
      </section>

      <footer className="relative border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-5 px-6 py-9 md:flex-row md:items-center md:px-10">
          <Logo href="/" size="sm" />
          <span className="text-[12px] text-[var(--fg-4)]">Crafted for the moments that make a tournament.</span>
          <span className="font-mono text-[11px] tracking-widest text-[var(--fg-4)]">S AUCTION SYSTEM</span>
        </div>
      </footer>
    </main>
  );
}
