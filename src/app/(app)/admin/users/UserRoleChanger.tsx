"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/types/roles";

const ROLES: Role[] = ["MAIN_CONTROLLER", "AUCTIONEER", "CAPTAIN", "VIEWER"];

export function UserRoleChanger({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: Role;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

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

  return (
    <select
      value={currentRole}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      className="bg-white/5 border border-white/10 rounded text-xs px-2 py-1 text-white"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}