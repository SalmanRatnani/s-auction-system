"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { unlockAudio } from "@/hooks/useBidAlerts";

const KEY = "sas:sound-enabled";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === "1") {
      setEnabled(true);
      unlockAudio();
    }
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(KEY, next ? "1" : "0");
    if (next) unlockAudio();
  }

  const Icon = enabled ? Volume2 : VolumeX;

  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? "Sound on" : "Sound off"}
      className={`grid h-8 w-8 place-items-center rounded-md border transition-colors duration-100 ${
        enabled
          ? "border-[var(--accent-line)] bg-[var(--accent-bg)] text-[var(--accent)]"
          : "border-[var(--line-1)] bg-[var(--bg-1)] text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:border-[var(--line-2)]"
      }`}
    >
      <Icon size={14} strokeWidth={1.75} />
    </button>
  );
}