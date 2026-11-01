"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "sas:last-activity";
const DEFAULT_INACTIVITY_MS = 30 * 60 * 1000; // 30 min
const DEFAULT_WARNING_MS = 60 * 1000; // warn 1 min before

export function useInactivityLogout({
  inactivityMs = DEFAULT_INACTIVITY_MS,
  warningMs = DEFAULT_WARNING_MS,
  enabled = true,
}: {
  inactivityMs?: number;
  warningMs?: number;
  enabled?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastActivityRef = useRef(0);

  const signOut = useCallback(
    async (reason: "timeout") => {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      router.push(`/login?reason=${reason}`);
      router.refresh();
    },
    [router, supabase],
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
        const value = Number(e.newValue);
        if (Number.isFinite(value) && value > 0)
          lastActivityRef.current = Math.min(value, Date.now());
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
      let stored = 0;
      try {
        const value = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
        if (Number.isFinite(value) && value > 0)
          stored = Math.min(value, Date.now());
      } catch {
        // Private browsing can deny storage; the in-memory timer still works.
      }
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

  // Auction status must not invalidate authentication.
  // Ended auctions remain viewable; server-side auction commands enforce LIVE status.

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
