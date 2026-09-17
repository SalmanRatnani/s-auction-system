"use client";

import { useRouter } from "next/navigation";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { Role } from "@/types/roles";
import { Clock } from "lucide-react";

export function AutoLogout({ role }: { role: Role }) {
  const { showWarning, secondsLeft, staySignedIn } = useInactivityLogout({
    role,
  });
  const router = useRouter();

  if (!showWarning) return null;

  async function signOutNow() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.7)] max-w-md w-full mx-4 p-8 text-center space-y-5 animate-scale-in">
        <div className="mx-auto h-12 w-12 grid place-items-center rounded-full border border-[var(--line-2)] bg-[var(--bg-2)]">
          <Clock size={20} strokeWidth={1.75} className="text-[var(--warning)]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-[20px] font-semibold tracking-tight">
            Still there?
          </h2>
          <p className="text-[13px] text-[var(--fg-3)] leading-relaxed">
            You&apos;ll be signed out in{" "}
            <span className="text-[var(--accent)] font-mono font-medium tnum">
              {secondsLeft}s
            </span>{" "}
            due to inactivity.
          </p>
        </div>
        <div className="flex gap-2 justify-center pt-1">
          <Button onClick={staySignedIn} size="lg">
            Stay signed in
          </Button>
          <Button variant="outline" size="lg" onClick={signOutNow}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}