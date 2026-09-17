"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";

type User = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
};

type Team = {
  id: string;
  name: string;
  logo_url: string | null;
  captain_user_id: string | null;
  initial_purse: number;
};

export function TeamCard({ team, users }: { team: Team; users: User[] }) {
  const router = useRouter();
  const [name, setName] = useState(team.name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const captain = users.find((u) => u.id === team.captain_user_id);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setErr(b.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete team "${team.name}"?`)) return;
    setBusy(true);
    const res = await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      alert(b.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-3">
          {team.logo_url ? (
            <img
              src={team.logo_url}
              alt=""
              className="h-12 w-12 rounded-lg object-cover border border-[var(--line-1)]"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-[var(--bg-2)] border border-[var(--line-1)] grid place-items-center text-[10px] font-mono text-[var(--fg-4)]">
              {team.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-[var(--fg-4)] uppercase tracking-[0.08em]">
              Captain
            </div>
            <div className="text-[13px] text-[var(--fg-1)] font-medium truncate mt-0.5">
              {captain ? captain.display_name ?? captain.email : "— unassigned —"}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-[var(--fg-4)] uppercase tracking-[0.08em] mb-1.5">
            Team name
          </label>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={busy || name.trim() === team.name}
              onClick={() => patch({ name: name.trim() })}
            >
              Save
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-[var(--fg-4)] uppercase tracking-[0.08em] mb-1.5">
            Assign captain
          </label>
          <select
            value={team.captain_user_id ?? ""}
            disabled={busy}
            onChange={(e) => patch({ captain_user_id: e.target.value || null })}
            className="h-9 w-full rounded-lg bg-[var(--bg-1)] border border-[var(--line-1)] px-3 text-[13px] text-[var(--fg-1)] focus:outline-none focus:border-[var(--accent-line)]"
          >
            <option value="">— none —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name ?? u.email} ({u.email})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-[var(--fg-4)] mt-1.5">
            Assigning a captain upgrades their role automatically.
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] pt-3 border-t border-[var(--line-1)]">
          <span className="text-[var(--fg-3)] tnum">
            Purse: {formatINR(team.initial_purse, { compact: true })}
          </span>
          <button
            onClick={remove}
            disabled={busy}
            className="text-[var(--danger)] hover:opacity-80 transition-opacity"
          >
            Delete team
          </button>
        </div>

        {err && (
          <div className="text-[12px] rounded-lg p-2 border border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger)]">
            {err}
          </div>
        )}
      </CardBody>
    </Card>
  );
}