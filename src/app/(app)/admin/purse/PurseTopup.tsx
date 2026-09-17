"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PurseTopup({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"add" | "sub" | null>(null);

  async function adjust(sign: 1 | -1) {
    const input = window.prompt(
      `Amount in ₹ to ${sign > 0 ? "add to" : "subtract from"} ${teamName}:`,
      "1000000"
    );
    if (!input) return;
    const rupees = Number(input);
    if (!Number.isFinite(rupees) || rupees <= 0) return;

    setBusy(sign > 0 ? "add" : "sub");
    const res = await fetch(`/api/teams/${teamId}/topup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(sign * rupees * 100),
        reason: sign > 0 ? "Controller top-up" : "Controller adjustment",
      }),
    });
    setBusy(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      alert(b.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => adjust(1)}
        loading={busy === "add"}
        disabled={busy !== null}
        className="flex-1"
      >
        <Plus size={12} strokeWidth={2.5} />
        Add funds
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => adjust(-1)}
        loading={busy === "sub"}
        disabled={busy !== null}
      >
        <Minus size={12} strokeWidth={2.5} />
      </Button>
    </div>
  );
}