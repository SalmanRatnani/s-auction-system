"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteRegistrationButton({
  registrationId,
  registrationName,
  status,
}: {
  registrationId: string;
  registrationName: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "APPROVED") {
    return <span className="text-[11px] text-[var(--fg-4)]">Revoke before deleting</span>;
  }

  async function handleDelete() {
    if (!window.confirm(
      `Permanently delete the registration for "${registrationName}"?\n\nThis cannot be undone. Any linked player must be removed separately.`
    )) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/registrations/${registrationId}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Deletion failed");
      router.push("/admin/registrations");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deletion failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="danger" size="sm" onClick={handleDelete} disabled={busy}>
        <Trash2 size={14} /> {busy ? "Deleting…" : "Delete"}
      </Button>
      {error && <span role="alert" className="text-[12px] text-[var(--danger)]">{error}</span>}
    </div>
  );
}
