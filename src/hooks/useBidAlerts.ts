"use client";

import { useEffect, useRef } from "react";

/** Plays a short sound + vibrates on new bid. */
export function useBidAlerts(trigger: unknown) {
  const lastTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;

    // Vibration (mobile)
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(150);
      } catch {
        // ignore
      }
    }

    // Sound
    try {
      const audio = new Audio("/sounds/outbid.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Browser autoplay policy — ignore
      });
    } catch {
      // ignore
    }
  }, [trigger]);
}