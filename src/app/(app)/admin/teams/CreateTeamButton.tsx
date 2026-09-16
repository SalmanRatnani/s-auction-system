"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CreateTeamButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const res = await fetch("/api/teams", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      alert(b.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  return (
    <Button onClick={create} loading={busy} disabled={disabled}>
      + Create team
    </Button>
  );
}