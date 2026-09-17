"use client";

import { useEffect, useState } from "react";
import { unlockAudio } from "@/hooks/useBidAlerts";

const KEY = "sas:sound-enabled";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === "1") {
      setEnabled(true);
      // Attempt silent unlock (will be a no-op until user gesture)
      unlockAudio();
    }
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(KEY, next ? "1" : "0");
    if (next) {
      unlockAudio();
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? "Sound on" : "Sound off"}
      className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors ${
        enabled
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-white/10 bg-white/5 text-white/50 hover:text-white"
      }`}
    >
      {enabled ? "🔔" : "🔕"}
    </button>
  );
}