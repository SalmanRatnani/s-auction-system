"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Check, ImagePlus } from "lucide-react";
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

type Player = {
  id: string;
  name: string;
  grade: string;
};

type Team = {
  id: string;
  name: string;
  logo_url: string | null;
  captain_user_id: string | null;
  co_captain_user_id: string | null;
  captain_player_id: string | null;
  co_captain_player_id: string | null;
  initial_purse: number;
};

export function TeamCard({
  team,
  users,
  players,
  takenPlayerIds = [],
}: {
  team: Team;
  users: User[];
  players: Player[];
  /** Players already chosen as playing captain of a different team. */
  takenPlayerIds?: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState(team.name);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const captain = users.find((u) => u.id === team.captain_user_id);
  const nameChanged = name.trim() !== team.name;
  const captainOptions = players.filter((p) => !takenPlayerIds.includes(p.id));

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

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);

    const fd = new FormData();
    fd.append("logo", file);

    const res = await fetch(`/api/teams/${team.id}/logo`, {
      method: "POST",
      body: fd,
    });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setErr(b.error ?? "Upload failed");
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
          <div
            className="relative group cursor-pointer shrink-0"
            onClick={() => !uploading && fileInputRef.current?.click()}
            title="Upload team logo"
            role="button"
            aria-label="Upload team logo"
          >
            {team.logo_url ? (
              <img
                src={team.logo_url}
                alt=""
                className="h-10 w-10 rounded-md object-cover border border-[var(--line-1)]"
              />
            ) : (
              <div className="h-10 w-10 rounded-md bg-[var(--bg-2)] border border-[var(--line-1)] grid place-items-center text-[13px] font-semibold text-[var(--fg-2)]">
                {avatarLabel}
              </div>
            )}

            <div className="absolute inset-0 bg-black/60 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <ImagePlus size={14} className="text-white" />
              )}
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              ref={fileInputRef}
              onChange={uploadLogo}
              className="hidden"
            />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="text-[14px] font-medium text-[var(--fg-1)] truncate">
              {team.name}
            </div>
            <div className="text-[11px] text-[var(--fg-4)] tnum mt-0.5">
              {formatINR(team.initial_purse, { compact: true })} purse
            </div>
          </div>

          <button
            onClick={remove}
            disabled={busy || uploading}
            title="Delete team"
            className="h-7 w-7 grid place-items-center rounded-md text-[var(--fg-4)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} strokeWidth={1.75} />
          </button>
        </div>

        {/* Captain Login */}
        <div className="space-y-1.5">
          <label className="block text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
            Captain Login
          </label>
          <select
            value={team.captain_user_id ?? ""}
            disabled={busy || uploading}
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

        {/* Second captain login — shares the same purse and roster */}
        <div className="space-y-1.5">
          <label className="block text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">Partner Captain Login (Optional)</label>
          <select
            value={team.co_captain_user_id ?? ""}
            disabled={busy || uploading}
            onChange={(e) => patch({ co_captain_user_id: e.target.value || null })}
            className="h-9 w-full rounded-md bg-[var(--bg-1)] border border-[var(--line-1)] px-2.5 text-[12px] text-[var(--fg-1)] focus:outline-none focus:border-[var(--accent-line)]"
          >
            <option value="">— no partner —</option>
            {users.filter((u) => u.id !== team.captain_user_id).map((u) => (
              <option key={u.id} value={u.id}>{u.display_name ?? u.email}</option>
            ))}
          </select>
          <p className="text-[10px] text-[var(--fg-4)]">Both captains can bid and manage this team. They share the same purse and roster.</p>
        </div>

        {/* Playing Captain (Player) */}
        <div className="space-y-1.5">
          <label className="block text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
            Playing Captain 1 (Optional)
          </label>
          <select
            value={team.captain_player_id ?? ""}
            disabled={busy || uploading}
            onChange={(e) => patch({ captain_player_id: e.target.value || null })}
            className="h-9 w-full rounded-md bg-[var(--bg-1)] border border-[var(--line-1)] px-2.5 text-[12px] text-[var(--fg-1)] focus:outline-none focus:border-[var(--accent-line)]"
          >
            <option value="">— none —</option>
            {captainOptions.filter((p) => p.id !== team.co_captain_player_id).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.grade})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-[var(--fg-4)]">
            Optional — leave empty if neither captain plays. If selected, this
            registered player is reserved until after Round 2, then assigned at
            the category average (or base price when no one sold).
          </p>
        </div>

        {/* Optional second playing captain, independent of login partnership */}
        <div className="space-y-1.5">
          <label className="block text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
            Playing Captain 2 (Optional)
          </label>
          <select
            value={team.co_captain_player_id ?? ""}
            disabled={busy || uploading}
            onChange={(e) => patch({ co_captain_player_id: e.target.value || null })}
            className="h-9 w-full rounded-md bg-[var(--bg-1)] border border-[var(--line-1)] px-2.5 text-[12px] text-[var(--fg-1)] focus:outline-none focus:border-[var(--accent-line)]"
          >
            <option value="">— none —</option>
            {captainOptions.filter((p) => p.id !== team.captain_player_id).map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.grade})</option>
            ))}
          </select>
          <p className="text-[10px] text-[var(--fg-4)]">A second registered player reserved for final allotment. Both playing captains share the team's roster and purse.</p>
        </div>

        {/* Team name */}
        <div className="space-y-1.5 border-t border-[var(--line-1)] pt-3 mt-1">
          <label className="block text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
            Team name
          </label>
          <div className="flex gap-1.5">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className="h-9 text-[12px]"
              disabled={busy || uploading}
            />
            <Button
              size="sm"
              variant={nameChanged ? "primary" : "ghost"}
              disabled={busy || uploading || !nameChanged || name.trim().length < 2}
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