"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeletePlayerButton({
  playerId,
  playerName,
}: {
  playerId: string;
  playerName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const ok = window.confirm(
      `Delete "${playerName}" permanently?\n\n` +
        "This removes the player from the pool and resets their registration to PENDING. " +
        "Only possible if the player is not in an auction or team."
    );
    if (!ok) return;

    setBusy(true);
    const res = await fetch(`/api/players/${playerId}`, { method: "DELETE" });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Delete failed");
      return;
    }
    router.refresh();
  }

  return (
    <button
  type="button"
  onClick={handleDelete}
  disabled={busy}
  title="Delete player"
  className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--danger)] hover:opacity-100 text-[11px] font-mono px-1"
>
  {busy ? "…" : "×"}
</button>
  );
}