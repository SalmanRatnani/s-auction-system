"use client";

import { useEffect, useRef } from "react";

/**
 * Play a short sound + vibrate on new bid.
 * Mobile-safe: uses a single preloaded Audio element that is unlocked
 * during the user's first interaction (browsers block audio otherwise).
 */

// Module-level singletons so we only load/preload once per session
let audioEl: HTMLAudioElement | null = null;
let audioUnlocked = false;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (audioEl) return audioEl;
  try {
    audioEl = new Audio("/sounds/outbid.mp3");
    audioEl.preload = "auto";
    audioEl.volume = 0.6;
    // Some browsers need load() to be called explicitly
    audioEl.load();
  } catch {
    audioEl = null;
  }
  return audioEl;
}

/** Call during the first user gesture to unlock audio on mobile. */
export function unlockAudio() {
  if (audioUnlocked) return;
  const el = getAudio();
  if (!el) return;
  const prevVol = el.volume;
  el.volume = 0;
  el.play()
    .then(() => {
      el.pause();
      el.currentTime = 0;
      el.volume = prevVol;
      audioUnlocked = true;
    })
    .catch(() => {
      // If it fails, we'll try again on the next gesture
      el.volume = prevVol;
    });
}

export function useBidAlerts(trigger: unknown) {
  const lastTrigger = useRef(trigger);

  // Unlock on first user interaction
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => unlockAudio();
    window.addEventListener("touchstart", handler, { passive: true, once: true });
    window.addEventListener("click", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  // Play on trigger change
  useEffect(() => {
    if (trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;

    // Vibration (Android Chrome, some others)
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([120, 60, 120]);
      } catch {
        // ignore
      }
    }

    // Sound
    const el = getAudio();
    if (!el) return;
    try {
      el.currentTime = 0;
      el.play().catch(() => {
        // Autoplay still blocked — the unlock handler will fix it on the next gesture
      });
    } catch {
      // ignore
    }
  }, [trigger]);
}