"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateViewerLink({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [hours, setHours] = useState(12);
  const [busy, setBusy] = useState(false);
  const [spectatorUrl, setSpectatorUrl] = useState<string | null>(null);
  const [projectorUrl, setProjectorUrl] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setSpectatorUrl(null);
    setProjectorUrl(null);
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
    const origin = window.location.origin;
    setSpectatorUrl(`${origin}/watch/${body.link.token}`);
    setProjectorUrl(`${origin}/watch/${body.link.token}/projector`);
    router.refresh();
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    alert("Copied!");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate new link</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm text-white/70">Valid for</label>
          <input
            type="number"
            min={1}
            max={72}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value) || 12)}
            className="h-9 w-20 rounded-md bg-white/5 border border-white/10 px-2 text-sm text-white"
          />
          <span className="text-sm text-white/70">hours</span>
          <Button onClick={create} loading={busy} className="ml-auto">
            Generate link
          </Button>
        </div>

        {spectatorUrl && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 space-y-2">
            <div className="text-xs text-emerald-300/70">
              📱 Spectator link (share on WhatsApp — opens mobile-friendly view)
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-emerald-200 break-all">
                {spectatorUrl}
              </code>
              <Button size="sm" variant="outline" onClick={() => copy(spectatorUrl)}>
                Copy
              </Button>
            </div>
          </div>
        )}

        {projectorUrl && (
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3 space-y-2">
            <div className="text-xs text-blue-300/70">
              📽️ Projector link (open fullscreen on the venue screen)
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-blue-200 break-all">
                {projectorUrl}
              </code>
              <Button size="sm" variant="outline" onClick={() => copy(projectorUrl)}>
                Copy
              </Button>
            </div>
          </div>
        )}

        {spectatorUrl && (
          <p className="text-[10px] text-white/40">
            Both links use the same token. They expire at the same time.
          </p>
        )}
      </CardBody>
    </Card>
  );
}