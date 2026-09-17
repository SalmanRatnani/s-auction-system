"use client";

import { useState, useEffect } from "react";
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

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-black/70 backdrop-blur-md animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="surface surface-glow max-w-md w-full mx-4 p-6 space-y-5 animate-scale-in">
        <div>
          <h2 className="text-xl font-display font-bold">Change display name</h2>
          <p className="text-sm text-white/50 mt-1">
            This is how your name appears to other users in the auction.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-white/60 uppercase tracking-wider">
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
          <div className="text-[11px] text-white/40 text-right">
            {name.trim().length}/40
          </div>
        </div>

        {err && (
          <div className="text-sm rounded-lg p-3 border bg-red-500/10 border-red-500/30 text-red-300">
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
}