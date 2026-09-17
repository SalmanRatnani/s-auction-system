"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "signin" | "signup" | "magic";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const initialMode = (params.get("mode") as Mode) ?? "signin";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Sync mode with URL query param when it changes
  useEffect(() => {
    const m = params.get("mode") as Mode | null;
    if (m && m !== mode) setMode(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const redirectTo = (path: string) =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(path)}`;

  async function handleGoogle() {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo(next) },
    });
    if (error) setMsg({ type: "error", text: error.message });
    setLoading(false);
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo(next) },
      });
      if (error) setMsg({ type: "error", text: error.message });
      else
        setMsg({
          type: "success",
          text: "Check your email to confirm your account.",
        });
    } else if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMsg({ type: "error", text: error.message });
      } else {
        router.push(next);
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo(next) },
      });
      if (error) setMsg({ type: "error", text: error.message });
      else
        setMsg({
          type: "success",
          text: "Magic link sent. Check your inbox.",
        });
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex">
      {/* ============ LEFT — BRAND PANEL ============ */}
      <aside className="hidden lg:flex w-1/2 xl:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900/40 to-blue-950" />

        {/* Court lines overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Radial glow */}
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-[120px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <span className="text-3xl leading-none transition-transform group-hover:rotate-12">
              🏸
            </span>
            <span className="text-xl font-display font-black tracking-tight">
              S Auction <span className="text-emerald-400">System</span>
            </span>
          </Link>

          {/* Middle — hero */}
          <div className="space-y-8 animate-slide-up">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live auction platform
              </div>

              <h1 className="text-5xl xl:text-6xl font-display font-black tracking-tight leading-[1.05]">
                Where{" "}
                <span className="text-gradient">champions</span> are made.
              </h1>

              <p className="text-lg text-white/60 leading-relaxed max-w-lg">
                Realtime bidding, live purse tracking, and instant roster
                updates. Built for badminton tournaments that move fast.
              </p>
            </div>

            {/* Feature bullets */}
            <div className="space-y-3 pt-2">
              <Bullet icon="⚡" text="Sub-second bid placement" />
              <Bullet icon="💰" text="Live purse tracking for every captain" />
              <Bullet icon="📺" text="Public spectator links + projector view" />
            </div>
          </div>

          {/* Bottom — subtle credit */}
          <div className="text-xs text-white/30 font-mono">
            S Auction System · v0.1
          </div>
        </div>
      </aside>

      {/* ============ RIGHT — AUTH FORM ============ */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
        {/* Mobile-only subtle background */}
        <div className="absolute inset-0 lg:hidden bg-court -z-10" />

        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link
            href="/"
            className="lg:hidden flex items-center justify-center gap-2 mb-8 group"
          >
            <span className="text-3xl">🏸</span>
            <span className="text-xl font-display font-black tracking-tight">
              S Auction <span className="text-emerald-400">System</span>
            </span>
          </Link>

          {/* Heading */}
          <div className="mb-8 animate-slide-up">
            <h2 className="text-3xl font-display font-bold tracking-tight">
              {mode === "signin"
                ? "Welcome back"
                : mode === "signup"
                ? "Create your account"
                : "Sign in with a link"}
            </h2>
            <p className="text-sm text-white/50 mt-2">
              {mode === "signin"
                ? "Sign in to continue to the auction."
                : mode === "signup"
                ? "Use the same email you registered with."
                : "We'll send a one-time link to your email."}
            </p>
          </div>

          {/* Google button */}
          <div className="animate-slide-up delay-100">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full !bg-white !text-neutral-900 hover:!bg-white/90 !font-semibold"
              onClick={handleGoogle}
              disabled={loading}
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6 animate-fade-in delay-200">
            <span className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/40 uppercase tracking-widest">
              or
            </span>
            <span className="flex-1 h-px bg-white/10" />
          </div>

          {/* Form */}
          <form
            onSubmit={handleEmail}
            className="space-y-4 animate-slide-up delay-200"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-white/60 uppercase tracking-wider"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            {mode !== "magic" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-white/60 uppercase tracking-wider"
                  >
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setMode("magic")}
                      className="text-[11px] text-emerald-400/80 hover:text-emerald-300 transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                />
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {mode === "signin"
                ? "Sign in"
                : mode === "signup"
                ? "Create account"
                : "Send magic link"}
            </Button>
          </form>

          {/* Message */}
          {msg && (
            <div
              className={`mt-4 text-sm rounded-xl p-3.5 border animate-slide-down ${
                msg.type === "error"
                  ? "bg-red-500/10 border-red-500/30 text-red-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              }`}
            >
              {msg.text}
            </div>
          )}

          {/* Mode switcher */}
          <div className="mt-6 text-sm text-white/50 text-center animate-fade-in delay-300">
            {mode === "signin" ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Create an account
                </button>
              </>
            ) : mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Prefer a password?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Sign in with password
                </button>
              </>
            )}
          </div>

          {/* Footer note */}
          <p className="text-center text-white/30 text-xs mt-10 leading-relaxed animate-fade-in delay-400">
            Viewers at the venue — use the spectator link
            <br className="hidden sm:inline" /> shared by the auctioneer.
          </p>
        </div>
      </main>
    </div>
  );
}

function Bullet({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 text-white/70">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06] border border-white/10 text-base">
        {icon}
      </span>
      <span className="text-sm">{text}</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}