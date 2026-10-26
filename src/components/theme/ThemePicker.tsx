"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun, SunMoon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import type { ThemePreference } from "./theme";

const options = [
  { value: "light", label: "Light", detail: "Warm & courtside", icon: Sun },
  { value: "dark", label: "Dark", detail: "Black & neon", icon: Moon },
  {
    value: "system",
    label: "System",
    detail: "Match your device",
    icon: Monitor,
  },
] as const;

export function ThemePicker() {
  const { preference, setPreference } = useTheme();
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !details.current?.contains(event.target) &&
        details.current
      )
        details.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function choose(value: ThemePreference) {
    setPreference(value);
    if (details.current) details.current.open = false;
    summary.current?.focus();
  }

  return (
    <details
      ref={details}
      className="theme-picker"
      onToggle={(event) => setOpen(event.currentTarget.open)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && details.current?.open) {
          event.preventDefault();
          event.stopPropagation();
          details.current.open = false;
          summary.current?.focus();
        }
      }}
    >
      <summary
        ref={summary}
        className="theme-toggle"
        aria-label="Choose color theme"
        title="Choose color theme"
      >
        <SunMoon size={19} aria-hidden="true" />
      </summary>
      <div className="theme-menu" role="group" aria-label="Color theme">
        <span className="theme-menu-label">YOUR ARENA. YOUR ATMOSPHERE.</span>
        {options.map(({ value, label, detail, icon: Icon }) => (
          <button
            type="button"
            key={value}
            className="theme-option"
            aria-pressed={preference === value}
            onClick={() => choose(value)}
          >
            <Icon size={17} aria-hidden="true" />
            <span>
              <strong>{label}</strong>
              <small>{detail}</small>
            </span>
            {preference === value && <Check size={15} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </details>
  );
}
