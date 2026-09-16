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

type Action = "start" | "end" | "reset" | "pause" | "resume";

export function AuctionControls({ auction }: { auction: Auction }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | "mode" | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function call(action: Action) {
    if (action === "reset") {
      const ok = window.confirm(
        "RESET the auction?\n\n" +
          "This deletes all bids, rosters, purse history, and auction_players rows. " +
          "Teams and player pool are kept. Auction returns to DRAFT."
      );
      if (!ok) return;
    }
    if (action === "end") {
      const ok = window.confirm(
        "End the auction? No more bidding will be allowed."
      );
      if (!ok) return;
    }

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
    const text =
      action === "start"
        ? `Auction started. Seeded ${body.seeded ?? 0} players.`
        : action === "end"
        ? "Auction ended."
        : action === "reset"
        ? "Auction reset to DRAFT."
        : action === "pause"
        ? "Auction paused."
        : "Auction resumed.";
    setMsg({ kind: "ok", text });
    router.refresh();
  }

  async function toggleMode() {
    const next = auction.mode === "LIVE" ? "DRY_RUN" : "LIVE";
    if (next === "LIVE") {
      const ok = window.confirm(
        "Switch to LIVE mode?\n\n" +
          "Use this only when you're ready for the real auction. " +
          "You can switch back, but any real progress you make is on you."
      );
      if (!ok) return;
    }
    setBusy("mode");
    setMsg(null);
    const res = await fetch(`/api/auction/${auction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMsg({ kind: "err", text: body.error ?? "Failed" });
      return;
    }
    setMsg({ kind: "ok", text: `Mode set to ${next}.` });
    router.refresh();
  }

  const isDraft = auction.status === "DRAFT" || auction.status === "ENDED";
  const isLive = auction.status === "LIVE";
  const isPaused = auction.status === "PAUSED";
  const isDryRun = auction.mode === "DRY_RUN";

  return (
    <Card className={isDryRun ? "border-amber-500/40" : "border-red-500/40"}>
      <CardHeader>
        <CardTitle>
          Controls{" "}
          <span
            className={`ml-2 text-xs font-normal px-2 py-0.5 rounded-full border ${
              isDryRun
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : "bg-red-500/15 text-red-300 border-red-500/30"
            }`}
          >
            {isDryRun ? "DRY RUN" : "LIVE EVENT"}
          </span>
        </CardTitle>
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

          {isLive && (
            <Button
              variant="outline"
              onClick={() => call("pause")}
              loading={busy === "pause"}
              disabled={busy !== null}
            >
              ⏸ Pause
            </Button>
          )}

          {isPaused && (
            <Button
              variant="primary"
              onClick={() => call("resume")}
              loading={busy === "resume"}
              disabled={busy !== null}
            >
              ▶ Resume
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => call("end")}
            loading={busy === "end"}
            disabled={(!isLive && !isPaused) || busy !== null}
          >
            End auction
          </Button>

          <Button
            variant="danger"
            onClick={() => call("reset")}
            loading={busy === "reset"}
            disabled={busy !== null}
          >
            Reset auction
          </Button>
        </div>

        {!isDraft && (
          <p className="text-xs text-white/40">
            Config is locked while the auction is {auction.status.toLowerCase()}. End
            it to unlock.
          </p>
        )}

        <div className="border-t border-white/10 pt-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-white/70">
              Current mode:{" "}
              <span className={isDryRun ? "text-amber-300" : "text-red-300"}>
                {auction.mode}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleMode}
              loading={busy === "mode"}
              disabled={busy !== null || isLive || isPaused}
            >
              {isDryRun ? "Switch to LIVE" : "Switch to DRY RUN"}
            </Button>
          </div>
          <p className="text-xs text-white/40 mt-2">
            {isDryRun
              ? "Rehearsal mode. Nothing counts. Run a full rehearsal, then Reset and switch to LIVE for the real event."
              : "Real event. Bids, sales, and purses are final."}
          </p>
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