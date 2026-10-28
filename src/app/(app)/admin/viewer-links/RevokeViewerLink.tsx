"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RevokeViewerLink({
  auctionId,
  linkId,
}: {
  auctionId: string;
  linkId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function revoke() {
    if (
      busy ||
      !window.confirm("Revoke this link? Anyone using it will lose access.")
    )
      return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/viewer-links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auctionId, linkId }),
        signal: AbortSignal.timeout(12_000),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not revoke link");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke link");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <Button size="sm" variant="outline" loading={busy} onClick={revoke}>
        Revoke
      </Button>
      {error && (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
