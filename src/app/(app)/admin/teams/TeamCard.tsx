"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Check } from "lucide-react";
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
  const nameChanged = name.trim() !== team.name;

  // Avatar: captain's initial if assigned, else team's first 2 letters
  const avatarLabel = captain
    ? (captain.display_name ?? captain.email).slice(0, 1).toUpperCase()
    : team.name.slice(0, 2).toUpperCase();

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
      <CardBody className="p-4 space-y-4">
        {/* Header — avatar + name + delete */}
        <div className="flex items-start gap-3">
          {team.logo_url ? (
            <img
              src={team.logo_url}
              alt=""
              className="h-10 w-10 rounded-md object-cover border border-[var(--line-1)] shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-md bg-[var(--bg-2)] border border-[var(--line-1)] grid place-items-center text-[13px] font-semibold text-[var(--fg-2)] shrink-0">
              {avatarLabel}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-medium text-[var(--fg-1)] truncate">
              {team.name}
            </div>
            <div className="text-[11px] text-[var(--fg-4)] tnum mt-0.5">
              {formatINR(team.initial_purse, { compact: true })} purse
            </div>
          </div>
          <button
            onClick={remove}
            disabled={busy}
            title="Delete team"
            className="h-7 w-7 grid place-items-center rounded-md text-[var(--fg-4)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
          >
            <Trash2 size={13} strokeWidth={1.75} />
          </button>
        </div>

        {/* Captain */}
        <div className="space-y-1.5">
          <label className="block text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
            Captain
          </label>
          <select
            value={team.captain_user_id ?? ""}
            disabled={busy}
            onChange={(e) => patch({ captain_user_id: e.target.value || null })}
            className="h-9 w-full rounded-md bg-[var(--bg-1)] border border-[var(--line-1)] px-2.5 text-[12px] text-[var(--fg-1)] focus:outline-none focus:border-[var(--accent-line)]"
          >
            <option value="">— unassigned —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name ?? u.email}
              </option>
            ))}
          </select>
          {captain && (
            <p className="text-[10px] text-[var(--fg-4)] truncate">
              {captain.email}
            </p>
          )}
        </div>

        {/* Team name */}
        <div className="space-y-1.5">
          <label className="block text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
            Team name
          </label>
          <div className="flex gap-1.5">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className="h-9 text-[12px]"
            />
            <Button
              size="sm"
              variant={nameChanged ? "primary" : "ghost"}
              disabled={busy || !nameChanged || name.trim().length < 2}
              onClick={() => patch({ name: name.trim() })}
              className="px-2.5 shrink-0"
              title="Save name"
            >
              <Check size={13} strokeWidth={2.5} />
            </Button>
          </div>
        </div>

        {err && (
          <div className="text-[11px] rounded-md p-2 border border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger)]">
            {err}
          </div>
        )}
      </CardBody>
    </Card>
  );
}