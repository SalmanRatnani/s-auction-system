"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";

type Team = {
  id: string;
  name: string;
  logo_url: string | null;
  initial_purse: number;
};

export function TeamEditor({ team }: { team: Team }) {
  const router = useRouter();
  const [name, setName] = useState(team.name);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function saveName() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setMsg({ kind: "err", text: b.error ?? "Failed" });
      return;
    }
    setMsg({ kind: "ok", text: "Team name saved." });
    router.refresh();
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("logo", file);
    const res = await fetch(`/api/teams/${team.id}/logo`, {
      method: "POST",
      body: fd,
    });
    setUploading(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setMsg({ kind: "err", text: b.error ?? "Upload failed" });
      return;
    }
    setMsg({ kind: "ok", text: "Logo uploaded." });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team details</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-4">
          {team.logo_url ? (
            <img
              src={team.logo_url}
              alt=""
              className="h-20 w-20 rounded-xl object-cover border border-white/10"
            />
          ) : (
            <div className="h-20 w-20 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-2xl">
              🏸
            </div>
          )}
          <div>
            <label className="block text-xs text-white/50 mb-1">Team logo</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={uploadLogo}
              disabled={uploading}
              className="text-sm text-white/70 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-white/10 file:text-white file:text-sm hover:file:bg-white/20"
            />
            <p className="text-[10px] text-white/40 mt-1">
              PNG / JPEG / WebP · max 2 MB
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Team name</label>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              minLength={2}
            />
            <Button
              onClick={saveName}
              loading={busy}
              disabled={name.trim() === team.name || name.trim().length < 2}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="text-xs text-white/50 pt-2 border-t border-white/5">
          Purse: {formatINR(team.initial_purse)}
        </div>

        {msg && (
          <div
            className={`text-sm rounded-lg p-3 border ${
              msg.kind === "err"
                ? "bg-red-500/10 border-red-500/30 text-red-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            {msg.text}
          </div>
        )}
      </CardBody>
    </Card>
  );
}