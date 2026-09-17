"use client";

import { useEffect, useRef, useState } from "react";

/** Smoothly animates a number from its previous value to a new value. */
export function useCountUp(target: number, durationMs = 600): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset if target jumped to 0 (e.g., new player drawn)
    if (target === 0) {
      setDisplay(0);
      fromRef.current = 0;
      return;
    }

    fromRef.current = display;
    startRef.current = null;

    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / durationMs, 1);
      // Ease-out cubic for a satisfying deceleration
      const eased = 1 - Math.pow(1 - t, 3);
      const value = fromRef.current + (target - fromRef.current) * eased;
      setDisplay(Math.round(value));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return display;
}