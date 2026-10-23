"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { safeRedirectPath } from "@/lib/security/request";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/branding/Logo";
import { BrandSculpture } from "@/components/branding/BrandSculpture";

type Mode = "signin" | "signup" | "magic" | "otp";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const supabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? createClient()
      : null;
  const router = useRouter();
  const params = useSearchParams();
  const requestedNext = params.get("next");
  const next = safeRedirectPath(requestedNext);
  const reason = params.get("reason");

  const [mode, setMode] = useState<Mode>(
    ["signin", "signup", "magic", "otp"].includes(params.get("mode") ?? "")
      ? (params.get("mode") as Mode)
      : "signin",
  );
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(
    null,
  );

  function resetForMode(m: Mode) {
    setMode(m);
    setMsg(null);
    setOtpSent(false);
    setCode("");
  }

  const redirectTo = (path: string) =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(path)}`;

  async function authenticate(
    action: (client: NonNullable<typeof supabase>) => Promise<void>,
  ) {
    if (loading || !supabase) return;
    setLoading(true);
    setMsg(null);
    try {
      await action(supabase);
    } catch {
      setMsg({
        kind: "err",
        text: "We couldn’t connect. Check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  }
  async function handleGoogle() {
    await authenticate(async (client) => {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo(next) },
      });
      if (error) setMsg({ kind: "err", text: error.message });
    });
  }
  async function handleSendOtp(e: React.SyntheticEvent) {
    e.preventDefault();
    await authenticate(async (client) => {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo(next), shouldCreateUser: false },
      });
      if (error) {
        setMsg({ kind: "err", text: error.message });
        return;
      }
      setOtpSent(true);
      setMsg({ kind: "ok", text: `Code sent to ${email}` });
    });
  }
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    await authenticate(async (client) => {
      const { error } = await client.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });
      if (error) {
        setMsg({ kind: "err", text: error.message });
        return;
      }
      router.push(next);
      router.refresh();
    });
  }
  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    await authenticate(async (client) => {
      if (mode === "signup") {
        const { error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo(next) },
        });
        setMsg(
          error
            ? { kind: "err", text: error.message }
            : { kind: "ok", text: "Check your email to confirm your account." },
        );
      } else if (mode === "signin") {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error)
          setMsg({
            kind: "err",
            text: "We couldn’t sign you in. Check your email and password, or use an email code.",
          });
        else {
          router.push(next);
          router.refresh();
        }
      } else {
        const { error } = await client.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo(next),
            shouldCreateUser: false,
          },
        });
        setMsg(
          error
            ? { kind: "err", text: error.message }
            : { kind: "ok", text: "Magic link sent. Check your inbox." },
        );
      }
    });
  }

  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="Welcome to S Auction">
        <Logo href="/" />
        <div>
          <BrandSculpture className="auth-brand-sculpture" />
          <span className="marketing-eyebrow">THE TEAM STARTS HERE</span>
          <h2 className="mt-7">
            YOUR TEAM.
            <br />
            YOUR CALL.
            <br />
            YOUR ARENA.
          </h2>
          <p>
            Every great squad starts with a decision. Make yours from a
            workspace built for the moment.
          </p>
          <Link href="/demo" className="marketing-primary mt-8">
            Explore the demo ↗
          </Link>
        </div>
        <div className="auth-story-foot">
          <ShieldCheck size={19} /> Connected teams. Confident decisions.
        </div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="flex justify-start mb-8 animate-fade-up md:hidden">
            <Logo href="/" />
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[11px] text-[var(--fg-3)] mb-9"
          >
            <ArrowLeft size={13} /> Back to home
          </Link>
          {!supabase && (
            <p
              role="status"
              className="mb-5 rounded-lg border border-[var(--warning-line)] p-3 text-xs text-[var(--warning)]"
            >
              Sign-in is not configured in this preview. You can explore the
              interactive demo.
            </p>
          )}
          {params.get("error") && (
            <p
              role="alert"
              className="mb-5 rounded-lg border border-[var(--danger-line)] p-3 text-xs text-[var(--danger)]"
            >
              That sign-in link could not be verified. Request a new code or
              sign in below.
            </p>
          )}
          <div className="animate-fade-up delay-50">
            <h1 className="text-[22px] font-semibold tracking-tight text-center">
              {mode === "signup"
                ? "Create your account"
                : mode === "otp"
                  ? otpSent
                    ? "Enter your code"
                    : "Sign in with a code"
                  : mode === "magic"
                    ? "Sign in with a link"
                    : "Welcome back"}
            </h1>
            <p className="text-[13px] text-[var(--fg-3)] text-left mt-3">
              {mode === "signup"
                ? "Use the email you registered with."
                : mode === "otp"
                  ? otpSent
                    ? `We sent a 6-digit code to ${email}`
                    : "We'll email you a 6-digit code."
                  : mode === "magic"
                    ? "We'll email you a one-time link."
                    : "Your auction workspace is one sign-in away."}
            </p>
          </div>

          {reason === "timeout" && (
            <div className="mt-6 text-[12px] rounded-lg p-3 border border-[var(--warning-line)] bg-[var(--warning-bg)] text-[var(--warning)] animate-fade-down">
              Signed out due to inactivity.
            </div>
          )}
          {reason === "auction-ended" && (
            <div className="mt-6 text-[12px] rounded-lg p-3 border border-[var(--info-line)] bg-[var(--info-bg)] text-[var(--info)] animate-fade-down">
              The auction has ended.
            </div>
          )}

          <div className="mt-8 animate-fade-up delay-100">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={handleGoogle}
              disabled={loading || !supabase}
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </div>

          <div className="flex items-center gap-3 my-6 animate-fade-up delay-100">
            <span className="flex-1 h-px bg-[var(--line-1)]" />
            <span className="text-[10px] text-[var(--fg-4)] uppercase tracking-widest">
              or
            </span>
            <span className="flex-1 h-px bg-[var(--line-1)]" />
          </div>

          <div className="animate-fade-up delay-150">
            {mode === "otp" ? (
              otpSent ? (
                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <Input
                    aria-label="Verification code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                    className="text-center text-lg tracking-[0.4em] font-mono h-12"
                    required
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    loading={loading}
                    disabled={!supabase}
                  >
                    Verify
                  </Button>
                  <div className="flex justify-between text-[12px] text-[var(--fg-3)] pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setCode("");
                        setMsg(null);
                      }}
                      className="hover:text-[var(--fg-1)]"
                    >
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading || !supabase}
                      className="hover:text-[var(--fg-1)]"
                    >
                      Resend
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSendOtp} className="space-y-3">
                  <Field label="Email">
                    <Input
                      id="email"
                      autoComplete="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </Field>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    loading={loading}
                    disabled={!supabase}
                  >
                    Send code
                  </Button>
                </form>
              )
            ) : (
              <form onSubmit={handleEmail} className="space-y-3">
                <Field label="Email">
                  <Input
                    id="email"
                    autoComplete="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </Field>

                {mode !== "magic" && (
                  <Field
                    label="Password"
                    aside={
                      mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => resetForMode("otp")}
                          className="text-[11px] text-[var(--fg-3)] hover:text-[var(--accent)] transition-colors"
                        >
                          Use a code
                        </button>
                      )
                    }
                  >
                    <div className="relative">
                      <Input
                        id="password"
                        autoComplete={
                          mode === "signup"
                            ? "new-password"
                            : "current-password"
                        }
                        type={showPassword ? "text" : "password"}
                        className="pr-12"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={mode === "signup" ? 8 : undefined}
                      />
                      <button
                        type="button"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-0 top-0 grid h-full w-11 place-items-center text-[var(--fg-3)]"
                      >
                        {showPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>
                  </Field>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  loading={loading}
                  disabled={!supabase}
                >
                  {mode === "signin"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send link"}
                </Button>
              </form>
            )}
          </div>

          {msg && (
            <div
              role={msg.kind === "err" ? "alert" : "status"}
              className={`mt-4 text-[12px] rounded-lg p-3 border animate-fade-down ${
                msg.kind === "err"
                  ? "border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger)]"
                  : "border-[var(--success-line)] bg-[var(--success-bg)] text-[var(--success)]"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="mt-8 text-[12px] text-[var(--fg-3)] text-center animate-fade-up delay-200">
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button
                  onClick={() => resetForMode("signup")}
                  className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Have an account?{" "}
                <button
                  onClick={() => resetForMode("signin")}
                  className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          <p className="text-center text-[var(--fg-4)] text-[11px] mt-12 leading-relaxed">
            Viewers at the venue — use the spectator link
            <br /> shared by the auctioneer.
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  aside,
  children,
}: {
  label: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={label.toLowerCase()}
          className="text-[12px] text-[var(--fg-2)]"
        >
          {label}
        </label>
        {aside}
      </div>
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
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
