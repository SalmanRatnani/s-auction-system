import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Gavel,
  Monitor,
  ShieldCheck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Logo, BrandMark } from "@/components/branding/Logo";
import { AuctionPreview } from "@/components/landing/AuctionPreview";
import { Reveal } from "@/components/landing/Reveal";

const features = [
  {
    icon: Zap,
    number: "01",
    title: "Every bid, connected.",
    description:
      "Captains, auctioneers and spectators follow the same action with live bid updates and automatic refresh.",
  },
  {
    icon: Wallet,
    number: "02",
    title: "Build with confidence.",
    description:
      "Track virtual purses, protect captain reserves and keep every squad within its category rules.",
  },
  {
    icon: Monitor,
    number: "03",
    title: "Own the big screen.",
    description:
      "Bring player profiles, leading bids and winning moments to your venue with a dedicated projector view.",
  },
];

export default async function Home() {
  // The public product page remains available before a deployment is configured.
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }
  return (
    <Reveal className="marketing-page">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="marketing-header">
        <div className="marketing-container marketing-nav">
          <Logo href="/" />
          <nav aria-label="Main navigation">
            <a href="#experience">Experience</a>
            <a href="#how-it-works">How it works</a>
            <a href="#roles">For your team</a>
          </nav>
          <Link href="/login" className="marketing-signin">
            Sign in <ArrowUpRight size={17} />
          </Link>
        </div>
      </header>
      <main id="main-content">
        <section className="marketing-container hero-grid">
          <div className="hero-copy">
            <span className="marketing-eyebrow">
              <span /> BUILT FOR BADMINTON. MADE FOR THE MOMENT.
            </span>
            <h1>
              GREAT TEAMS
              <br />
              START WITH
              <br />
              <span>A BOLD BID.</span>
            </h1>
            <p>
              The auction room your tournament deserves. Bring your players,
              captains and crowd together, from the first call to the final
              hammer.
            </p>
            <div className="hero-buttons">
              <Link href="/login" className="marketing-primary">
                Enter your auction <ArrowUpRight size={20} />
              </Link>
              <Link href="/demo" className="marketing-secondary">
                Explore the demo <ArrowRight size={18} />
              </Link>
            </div>
            <div className="hero-proof">
              <span>
                <ShieldCheck size={15} /> Role-based access
              </span>
              <span>
                <Zap size={15} /> Realtime updates
              </span>
            </div>
          </div>
          <div className="hero-preview-wrap">
            <div className="hero-orbit" aria-hidden="true" />
            <div className="hero-side-label" aria-hidden="true">
              PRECISION / PASSION / POSSIBILITIES
            </div>
            <AuctionPreview />
            <div className="hero-caption">
              <span>01 — THE LIVE EXPERIENCE</span>
              <span>YOUR NEXT CHAPTER STARTS HERE ↗</span>
            </div>
          </div>
        </section>
        <div className="marketing-ribbon">
          <div className="marketing-container">
            <span>SET THE STAGE</span>
            <span aria-hidden="true">↗</span>
            <span>MAKE YOUR MOVE</span>
            <span aria-hidden="true">↗</span>
            <span>BUILD YOUR LEGACY</span>
            <span aria-hidden="true">↗</span>
          </div>
        </div>
        <section
          id="experience"
          className="marketing-container marketing-section"
        >
          <div className="section-intro" data-reveal>
            <div>
              <span className="marketing-eyebrow">
                THE COMPLETE AUCTION EXPERIENCE
              </span>
              <h2>
                Less to manage.
                <br />
                More to play for.
              </h2>
            </div>
            <p>
              One focused workspace for all the moving parts of auction day.
              Clear information. Decisive controls. Room for the excitement.
            </p>
          </div>
          <div className="feature-grid">
            {features.map(
              ({ icon: Icon, number, title, description }, index) => (
                <article
                  className="marketing-feature"
                  key={number}
                  data-reveal
                  data-reveal-delay={index * 70}
                >
                  <div className="feature-top">
                    <Icon size={27} strokeWidth={1.6} />
                    <span>{number} /</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ),
            )}
          </div>
        </section>
        <section id="how-it-works" className="marketing-workflow">
          <div className="marketing-container workflow-grid">
            <div data-reveal>
              <span className="marketing-eyebrow">FROM SETUP TO SOLD</span>
              <h2>
                All the action.
                <br />
                One arena.
              </h2>
              <p>
                Keep your attention on the room. Let a connected workflow handle
                the details.
              </p>
              <Link href="/demo" className="marketing-primary">
                Take a look inside <ArrowUpRight size={18} />
              </Link>
            </div>
            <ol>
              {[
                {
                  title: "Set your lineup",
                  desc: "Review registrations, grade players and assign team captains.",
                },
                {
                  title: "Bring everyone in",
                  desc: "Give each role the tools they need. Share spectator links with your audience.",
                },
                {
                  title: "Let the bidding begin",
                  desc: "Draw players, follow the bids and confirm sales. Team rosters and purses update together.",
                },
              ].map((s, i) => (
                <li key={s.title} data-reveal data-reveal-delay={i * 70}>
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </div>
                  <Check size={19} />
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section id="roles" className="marketing-container marketing-section">
          <div className="section-intro" data-reveal>
            <div>
              <span className="marketing-eyebrow">A PLACE FOR EVERY ROLE</span>
              <h2>
                Your team.
                <br />
                In perfect sync.
              </h2>
            </div>
            <p>
              The right view for every seat in the room, with permissions that
              keep each person focused.
            </p>
          </div>
          <div className="roles-grid">
            {[
              {
                icon: ShieldCheck,
                title: "Organizers",
                text: "Prepare the event. Manage access. Keep the whole picture in view.",
              },
              {
                icon: Gavel,
                title: "Auctioneers",
                text: "Control the pace, draw the next player and make the final call.",
              },
              {
                icon: Users,
                title: "Captains",
                text: "Follow your purse, place your bid and shape your winning squad.",
              },
              {
                icon: Monitor,
                title: "Spectators",
                text: "Watch every moment unfold from a live link or the venue screen.",
              },
            ].map(({ icon: Icon, title, text }, index) => (
              <article key={title} data-reveal data-reveal-delay={index * 60}>
                <Icon size={25} strokeWidth={1.6} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="marketing-container">
          <div className="marketing-final" data-reveal>
            <BrandMark className="h-14 w-14" />
            <span className="marketing-eyebrow">THE TEAM STARTS HERE</span>
            <h2>
              Make your next
              <br />
              auction a statement.
            </h2>
            <Link href="/login" className="marketing-primary">
              Let’s get you courtside <ArrowUpRight size={20} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="marketing-container marketing-footer">
        <Logo href="/" size="sm" />
        <p>Built for the game. Designed for your team.</p>
        <div>
          <Link href="/demo">Try the demo</Link>
          <Link href="/login">
            Sign in <ArrowUpRight size={13} />
          </Link>
        </div>
      </footer>
    </Reveal>
  );
}
