"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: Event) => {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
  }, [open]);

  function choose(value: ThemePreference) {
    setPreference(value);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  return (
    <div
      ref={container}
      className="theme-picker"
      data-open={open}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus({ preventScroll: true });
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="theme-toggle"
        aria-label="Choose color theme"
        aria-expanded={open}
        aria-controls={menuId}
        title="Choose color theme"
        onClick={() => setOpen((value) => !value)}
      >
        <SunMoon size={19} aria-hidden="true" />
      </button>
      <div
        id={menuId}
        className="theme-menu"
        role="group"
        aria-label="Color theme"
        hidden={!open}
      >
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
    </div>
  );
}
