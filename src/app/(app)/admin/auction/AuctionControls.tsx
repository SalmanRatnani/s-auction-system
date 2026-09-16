"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

type Auction = {
  id: string;
  status: string;
  mode: string;
};

export function AuctionControls({ auction }: { auction: Auction }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"start" | "end" | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function call(action: "start" | "end") {
    setBusy(action);
    setMsg(null);
    const res = await fetch(`/api/auction/${auction.id}/${action}`, {
      method: "POST",
    });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMsg({ kind: "err", text: body.error ?? "Failed" });
      return;
    }
    setMsg({
      kind: "ok",
      text: action === "start" ? `Auction started. Seeded ${body.seeded ?? 0} players.` : "Auction ended.",
    });
    router.refresh();
  }

  const isDraft = auction.status === "DRAFT" || auction.status === "ENDED";
  const isLive = auction.status === "LIVE";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Controls</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => call("start")}
            loading={busy === "start"}
            disabled={!isDraft || busy !== null}
          >
            Start auction
          </Button>
          <Button
            variant="outline"
            onClick={() => call("end")}
            loading={busy === "end"}
            disabled={!isLive || busy !== null}
          >
            End auction
          </Button>
        </div>

        {!isDraft && (
          <p className="text-xs text-white/40">
            Config is locked while the auction is LIVE. End it to unlock.
          </p>
        )}

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