"use client";

import { useRouter } from "next/navigation";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { Role } from "@/types/roles";

export function AutoLogout({ role }: { role: Role }) {
  const { showWarning, secondsLeft, staySignedIn } = useInactivityLogout({ role });
  const router = useRouter();

  if (!showWarning) return null;

  async function signOutNow() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="surface surface-glow max-w-md w-full mx-4 p-8 text-center space-y-5 animate-scale-in">
        <div className="text-5xl animate-float">⏳</div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold">Still there?</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            You'll be signed out in{" "}
            <span className="text-emerald-300 font-mono font-bold tabular-nums">
              {secondsLeft}s
            </span>{" "}
            due to inactivity.
          </p>
        </div>
        <div className="flex gap-2 justify-center pt-2">
          <Button onClick={staySignedIn} size="lg">
            Stay signed in
          </Button>
          <Button variant="outline" size="lg" onClick={signOutNow}>
            Sign out now
          </Button>
        </div>
      </div>
    </div>
  );
}