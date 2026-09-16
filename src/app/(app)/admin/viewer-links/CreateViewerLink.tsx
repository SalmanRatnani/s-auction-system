"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateViewerLink({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [hours, setHours] = useState(12);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);

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
    const path = `${window.location.origin}/watch/${body.link.token}`;
    setLink(path);
    router.refresh();
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    alert("Copied!");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate new link</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="flex items-center gap-3">
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

        {link && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
            <div className="text-xs text-emerald-300/70 mb-1">
              Share this with viewers:
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-emerald-200 break-all">
                {link}
              </code>
              <Button size="sm" variant="outline" onClick={copy}>
                Copy
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}