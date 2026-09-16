"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

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

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

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
      else setMsg({ type: "success", text: "Check your email to confirm your account." });
    } else if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
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
      else setMsg({ type: "success", text: "Magic link sent. Check your inbox." });
    }

    setLoading(false);
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black">
          S Auction <span className="text-emerald-400">System</span>
        </h1>
        <p className="text-white/50 text-sm mt-2">
          Badminton player auction · realtime
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "signin"
              ? "Sign in"
              : mode === "signup"
              ? "Create account"
              : "Magic link"}
          </CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Google or email + password."
              : mode === "signup"
              ? "Use the email you registered with."
              : "We'll email you a one-time sign-in link."}
          </CardDescription>
        </CardHeader>

        <CardBody className="space-y-4">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-white/40 text-xs">
            <span className="flex-1 h-px bg-white/10" />
            OR
            <span className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            {mode !== "magic" && (
              <Input
                type="password"
                placeholder="Password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            )}

            <Button type="submit" className="w-full" loading={loading}>
              {mode === "signin"
                ? "Sign in"
                : mode === "signup"
                ? "Create account"
                : "Send magic link"}
            </Button>
          </form>

          {msg && (
            <div
              className={`text-sm rounded-lg p-3 border ${
                msg.type === "error"
                  ? "bg-red-500/10 border-red-500/30 text-red-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60 pt-2">
            {mode !== "signin" && (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="hover:text-white"
              >
                ← Sign in
              </button>
            )}
            {mode !== "signup" && (
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="hover:text-white"
              >
                Create account →
              </button>
            )}
            {mode === "signin" && (
              <button
                type="button"
                onClick={() => setMode("magic")}
                className="hover:text-white"
              >
                Email me a link instead
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      <p className="text-center text-white/40 text-xs mt-6">
        Viewers at the venue — use the spectator link shared by the auctioneer.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
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