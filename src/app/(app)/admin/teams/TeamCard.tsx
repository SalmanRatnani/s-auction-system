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
      <CardBody className="space-y-3">
        <div className="flex items-center gap-3">
          {team.logo_url ? (
            <img
              src={team.logo_url}
              alt=""
              className="h-14 w-14 rounded-lg object-cover border border-white/10"
            />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-white/5 border border-white/10 grid place-items-center text-white/30">
              🏸
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white/50">Captain</div>
            <div className="font-medium truncate">
              {captain ? captain.display_name ?? captain.email : "— unassigned —"}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Team name</label>
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
          <label className="block text-xs text-white/50 mb-1">Assign captain</label>
          <select
            value={team.captain_user_id ?? ""}
            disabled={busy}
            onChange={(e) =>
              patch({ captain_user_id: e.target.value || null })
            }
            className="h-10 w-full rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-white"
          >
            <option value="">— none —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name ?? u.email} ({u.email})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-white/40 mt-1">
            Assigning a captain upgrades their role automatically.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-white/50 pt-2 border-t border-white/5">
          <span>Purse: {formatINR(team.initial_purse, { compact: true })}</span>
          <button
            onClick={remove}
            disabled={busy}
            className="text-red-400/80 hover:text-red-300"
          >
            Delete team
          </button>
        </div>

        {err && (
          <div className="text-xs rounded p-2 border bg-red-500/10 border-red-500/30 text-red-300">
            {err}
          </div>
        )}
      </CardBody>
    </Card>
  );
}