"use client";

import { TeamLogo } from "@/components/branding/TeamLogo";
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
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  async function saveName() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setMsg({ kind: "err", text: b.error ?? "Failed" });
        return;
      }
      setMsg({ kind: "ok", text: "Team name saved." });
      router.refresh();
    } catch {
      setMsg({
        kind: "err",
        text: "Connection interrupted. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const input = e.currentTarget;
    if (!file || uploading) return;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch(`/api/teams/${team.id}/logo`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setMsg({ kind: "err", text: b.error ?? "Upload failed" });
        return;
      }
      setMsg({ kind: "ok", text: "Logo uploaded." });
      router.refresh();
    } catch {
      setMsg({
        kind: "err",
        text: "Connection interrupted. Your logo could not be uploaded.",
      });
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team details</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="flex items-center gap-4">
          <TeamLogo
            name={team.name}
            src={team.logo_url}
            className="!w-12 !h-12 mx-auto"
          />
          <div className="flex-1 min-w-0">
            <label
              htmlFor="team-logo"
              className="block text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)] mb-1.5"
            >
              Team logo
            </label>
            <input
              id="team-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={uploadLogo}
              disabled={uploading}
              className="max-w-full text-[12px] text-[var(--fg-3)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[var(--bg-2)] file:text-[var(--fg-1)] file:text-[12px] hover:file:bg-[var(--bg-3)]"
            />
            <p className="text-[10px] text-[var(--fg-4)] mt-1">
              PNG / JPEG / WebP · max 2 MB
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="team-name"
            className="block text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]"
          >
            Team name
          </label>
          <div className="flex gap-2">
            <Input
              id="team-name"
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

        <div className="text-[12px] text-[var(--fg-4)] pt-3 border-t border-[var(--line-1)] tnum">
          Purse: {formatINR(team.initial_purse)}
        </div>

        {msg && (
          <div
            role={msg.kind === "err" ? "alert" : "status"}
            className={`text-[13px] rounded-lg p-3 border ${
              msg.kind === "err"
                ? "border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger)]"
                : "border-[var(--success-line)] bg-[var(--success-bg)] text-[var(--success)]"
            }`}
          >
            {msg.text}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
