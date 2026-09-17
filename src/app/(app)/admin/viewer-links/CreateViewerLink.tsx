"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function CreateViewerLink({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [hours, setHours] = useState(12);
  const [busy, setBusy] = useState(false);
  const [spectator, setSpectator] = useState<string | null>(null);
  const [projector, setProjector] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    const res = await fetch("/api/viewer-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auctionId, hoursValid: hours }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      alert(body.error ?? "Failed");
      return;
    }
    const base = window.location.origin;
    setSpectator(`${base}/watch/${body.link.token}`);
    setProjector(`${base}/watch/${body.link.token}/projector`);
    router.refresh();
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate new link</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="block text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
              Valid for
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={72}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value) || 12)}
                className="h-9 w-20 tnum"
              />
              <span className="text-[13px] text-[var(--fg-3)]">hours</span>
            </div>
          </div>
          <Button onClick={create} loading={busy} size="sm">
            <Link2 size={13} strokeWidth={2} />
            Generate link
          </Button>
        </div>

        {spectator && (
          <div className="rounded-lg border border-[var(--success-line)] bg-[var(--success-bg)] p-3 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--success)]">
              Spectator link
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[12px] text-[var(--success)] break-all font-mono">
                {spectator}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copy(spectator)}
              >
                <Copy size={13} strokeWidth={2} />
              </Button>
            </div>
          </div>
        )}

        {projector && (
          <div className="rounded-lg border border-[var(--info-line)] bg-[var(--info-bg)] p-3 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--info)]">
              Projector link
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[12px] text-[var(--info)] break-all font-mono">
                {projector}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copy(projector)}
              >
                <Copy size={13} strokeWidth={2} />
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}