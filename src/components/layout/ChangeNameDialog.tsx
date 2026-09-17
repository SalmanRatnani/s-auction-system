"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChangeNameDialog({
  currentName,
  onClose,
  onSaved,
}: {
  currentName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function save() {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 40) {
      setErr("Name must be 2–40 characters");
      return;
    }
    if (trimmed === currentName) {
      onClose();
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: trimmed }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(body.error ?? "Failed to update");
      return;
    }
    onSaved();
  }

  if (!mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[10000] grid place-items-center bg-black/70 backdrop-blur-md animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.7)] max-w-md w-full mx-4 p-6 space-y-5 animate-scale-in">
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight">
            Change display name
          </h2>
          <p className="text-[13px] text-[var(--fg-3)] mt-1">
            This is how your name appears to other users.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-[var(--fg-2)] uppercase tracking-[0.08em]">
            Display name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
          />
          <div className="text-[11px] text-[var(--fg-4)] text-right tnum">
            {name.trim().length}/40
          </div>
        </div>

        {err && (
          <div className="text-[13px] rounded-lg p-3 border border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger)]">
            {err}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={save}
            loading={busy}
            disabled={name.trim() === currentName || name.trim().length < 2}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}