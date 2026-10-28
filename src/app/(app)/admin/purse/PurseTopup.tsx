"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendAction, type PendingAction } from "@/lib/action-request";

export function PurseTopup({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const router = useRouter();
  const pending = useRef<PendingAction | null>(null);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function adjust() {
    if (inFlight.current) return;
    let amount = pending.current?.body.amount;
    if (!pending.current) {
      const input = window.prompt(
        `Virtual credits in ₹ units to add to ${teamName}:`,
        "1000000",
      );
      if (!input) return;
      amount = Math.round(Number(input) * 100);
      if (
        !Number.isSafeInteger(amount) ||
        Number(amount) <= 0 ||
        Number(amount) > 100_000_000_000
      ) {
        setError("Enter a valid positive amount.");
        return;
      }
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const { response, body } = await sendAction(
        `/api/teams/${teamId}/topup`,
        { amount, reason: "Controller top-up" },
        pending,
      );
      if (!response.ok) {
        setError(body.error ?? "Top-up could not be confirmed.");
        return;
      }
      router.refresh();
    } catch {
      setError(
        "Confirmation interrupted. Retry to check the same top-up; it will not be added twice.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={adjust}
        loading={busy}
        disabled={busy}
        className="w-full"
      >
        <Plus size={12} />
        {pending.current ? "Check pending top-up" : "Add virtual credits"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
