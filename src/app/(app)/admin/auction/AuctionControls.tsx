"use client";

import { sendAction, type PendingAction } from "@/lib/action-request";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, RotateCcw, Pause, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Auction = {
  id: string;
  status: string;
  mode: string;
  state_version: number;
};

export function AuctionControls({ auction }: { auction: Auction }) {
  const router = useRouter();
  const pending = useRef<PendingAction | null>(null);
  const [hasPending, setHasPending] = useState(false);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState<
    "start" | "end" | "reset" | "mode" | "pause" | "resume" | null
  >(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  async function call(action: "start" | "end" | "reset" | "pause" | "resume") {
    if (inFlight.current) return;
    if (action === "reset" && !pending.current) {
      const confirmed = window.confirm(
        "RESET the auction?\n\n" +
          "This deletes all bids, rosters, purse history, and auction_players rows. " +
          "Teams and player pool are kept. Auction returns to DRAFT.",
      );
      if (!confirmed) return;
    }
    inFlight.current = true;
    setBusy(action);
    setMsg(null);
    try {
      const { response: res, body } = await sendAction(
        `/api/auction/${auction.id}/${action}`,
        { expectedVersion: auction.state_version },
        pending,
      );
      if (!res.ok) {
        setMsg({ kind: "err", text: body.error ?? "Action failed" });
        router.refresh();
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
    } catch {
      setMsg({
        kind: "err",
        text: "Confirmation interrupted. Retry the same action to retrieve its result safely.",
      });
    } finally {
      inFlight.current = false;
      setHasPending(pending.current !== null);
      setBusy(null);
    }
  }

  async function toggleMode() {
    if (inFlight.current) return;
    if (pending.current) {
      setMsg({
        kind: "err",
        text: "Confirm the previous action before changing mode.",
      });
      return;
    }
    const next = auction.mode === "LIVE" ? "DRY_RUN" : "LIVE";
    if (next === "LIVE") {
      const ok = window.confirm(
        "Switch to LIVE mode?\n\n" +
          "Use this only when you're ready for the real auction. " +
          "You can switch back, but any real progress you make is on you.",
      );
      if (!ok) return;
    }
    inFlight.current = true;
    setBusy("mode");
    setMsg(null);
    try {
      const res = await fetch(`/api/auction/${auction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
        signal: AbortSignal.timeout(12_000),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({
          kind: "err",
          text: body.error ?? "Mode could not be changed.",
        });
        return;
      }
      setMsg({ kind: "ok", text: `Mode set to ${next}.` });
      router.refresh();
    } catch {
      setMsg({
        kind: "err",
        text: "The mode change could not be confirmed. Refresh to check the current mode.",
      });
      router.refresh();
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  const isDraft = auction.status === "DRAFT";
  const isLive = auction.status === "LIVE";
  const isPaused = auction.status === "PAUSED";
  const isDryRun = auction.mode === "DRY_RUN";

  return (
    <Card
      className={
        isDryRun
          ? "border-[var(--warning-line)]"
          : "border-[var(--danger-line)]"
      }
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Controls</CardTitle>
          <Badge tone={isDryRun ? "warning" : "danger"}>
            {isDryRun ? "Dry run" : "Live event"}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {hasPending && !busy && (
          <div role="alert" className="text-sm text-[var(--warning)]">
            Previous action awaiting confirmation.
            <Button
              variant="outline"
              size="sm"
              className="ml-3"
              onClick={() =>
                void call(
                  pending.current!.url.split("/").pop() as
                    | "start"
                    | "end"
                    | "reset"
                    | "pause"
                    | "resume",
                )
              }
            >
              Confirm previous action
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => call("start")}
            loading={busy === "start"}
            disabled={!isDraft || busy !== null}
            size="sm"
          >
            <Play size={13} strokeWidth={2} />
            Start auction
          </Button>
          {isLive && (
            <Button
              variant="outline"
              onClick={() => call("pause")}
              loading={busy === "pause"}
              disabled={busy !== null}
              size="sm"
            >
              <Pause size={13} strokeWidth={2} />
              Pause
            </Button>
          )}
          {isPaused && (
            <Button
              variant="primary"
              onClick={() => call("resume")}
              loading={busy === "resume"}
              disabled={busy !== null}
              size="sm"
            >
              <Play size={13} strokeWidth={2} />
              Resume
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => call("end")}
            loading={busy === "end"}
            disabled={!isLive || busy !== null}
            size="sm"
          >
            <Square size={13} strokeWidth={2} />
            End
          </Button>
          <Button
            variant="danger"
            onClick={() => call("reset")}
            loading={busy === "reset"}
            disabled={busy !== null || !isDryRun || (!isDraft && !isPaused)}
            size="sm"
          >
            <RotateCcw size={13} strokeWidth={2} />
            Reset
          </Button>
        </div>

        <div className="border-t border-[var(--line-1)] pt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-[13px] text-[var(--fg-3)]">
              Current mode:{" "}
              <span
                className={
                  isDryRun ? "text-[var(--warning)]" : "text-[var(--danger)]"
                }
              >
                {auction.mode}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleMode}
              loading={busy === "mode"}
              disabled={busy !== null || !isDraft}
            >
              <RefreshCw size={13} strokeWidth={2} />
              {isDryRun ? "Switch to LIVE" : "Switch to DRY RUN"}
            </Button>
          </div>
          <p className="text-[12px] text-[var(--fg-4)] mt-2 leading-relaxed">
            {isDryRun
              ? "Rehearsal mode. Nothing counts. Pause a rehearsal to reset it. Completed events stay archived."
              : "Real event. Bids, sales, and purses are final."}
          </p>
        </div>

        {msg && (
          <div
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
