"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/types/roles";

const STORAGE_KEY = "sas:last-activity";
const DEFAULT_INACTIVITY_MS = 30 * 60 * 1000; // 30 min
const DEFAULT_WARNING_MS = 60 * 1000;         // warn 1 min before
const AUCTION_POLL_MS = 30 * 1000;            // poll every 30s

export function useInactivityLogout({
  role,
  inactivityMs = DEFAULT_INACTIVITY_MS,
  warningMs = DEFAULT_WARNING_MS,
  enabled = true,
}: {
  role: Role;
  inactivityMs?: number;
  warningMs?: number;
  enabled?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastActivityRef = useRef<number>(Date.now());

  const signOut = useCallback(
    async (reason: "timeout" | "auction-ended") => {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      router.push(`/login?reason=${reason}`);
      router.refresh();
    },
    [router, supabase]
  );

  // Activity tracking (with cross-tab sync)
  useEffect(() => {
    if (!enabled) return;
    const mark = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        // ignore
      }
    };
    mark();

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        lastActivityRef.current = Number(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      events.forEach((e) => window.removeEventListener(e, mark));
      window.removeEventListener("storage", onStorage);
    };
  }, [enabled]);

  // Inactivity check (1s tick)
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      const stored = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
      const last = Math.max(lastActivityRef.current, stored);
      const idle = Date.now() - last;

      if (idle >= inactivityMs) {
        signOut("timeout");
      } else if (idle >= inactivityMs - warningMs) {
        setShowWarning(true);
        setSecondsLeft(Math.ceil((inactivityMs - idle) / 1000));
      } else {
        setShowWarning(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [enabled, inactivityMs, warningMs, signOut]);

  // Auction-end broadcast (non-controllers get signed out)
  useEffect(() => {
    if (!enabled) return;
    if (role === "MAIN_CONTROLLER") return; // controllers stay

    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/auth/auction-status", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { ended?: boolean };
        if (cancelled) return;
        if (body.ended) signOut("auction-ended");
      } catch {
        // network blip — retry next tick
      }
    };
    check();
    const interval = setInterval(check, AUCTION_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, role, signOut]);

  const staySignedIn = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      // ignore
    }
    setShowWarning(false);
  }, []);

  return { showWarning, secondsLeft, staySignedIn };
}