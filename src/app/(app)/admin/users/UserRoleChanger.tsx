"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { Role } from "@/types/roles";

const ROLES: Role[] = ["MAIN_CONTROLLER", "AUCTIONEER", "CAPTAIN", "VIEWER"];

export function UserRoleChanger({
  userId,
  currentRole,
  currentEmail,
}: {
  userId: string;
  currentRole: Role;
  currentEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function change(role: string) {
    if (role === currentRole) return;
    setBusy(true);
    const res = await fetch(`/api/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      alert(b.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  async function remove() {
    const ok = window.confirm(
      `Delete ${currentEmail}?\n\n` +
        "This permanently removes the user from auth and the app. " +
        "Teams they captain will be unassigned. Bids, audit entries, " +
        "and ledger rows stay but lose their attribution. This cannot be undone."
    );
    if (!ok) return;

    setDeleting(true);
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      alert(b.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentRole}
        disabled={busy || deleting}
        onChange={(e) => change(e.target.value)}
        className="bg-[var(--bg-2)] border border-[var(--line-1)] rounded-md text-[11px] px-2 py-1 text-[var(--fg-1)] focus:outline-none focus:border-[var(--accent-line)] disabled:opacity-50"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r.replace("_", " ")}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={remove}
        disabled={deleting || busy}
        title="Delete user"
        className="h-7 w-7 grid place-items-center rounded-md text-[var(--fg-4)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors disabled:opacity-40"
      >
        <Trash2 size={13} strokeWidth={1.75} />
      </button>
    </div>
  );
}