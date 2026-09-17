"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_ORDER } from "@/constants/categories";

export function ReviewForm({
  registrationId,
  currentStatus,
  defaultGrade,
}: {
  registrationId: string;
  currentStatus: string;
  defaultGrade?: string | null;
}) {
  const router = useRouter();
  const [grade, setGrade] = useState(defaultGrade ?? "");
  const [loading, setLoading] = useState<
    "approve" | "reject" | "revoke" | null
  >(null);
  const [err, setErr] = useState<string | null>(null);

  async function act(kind: "approve" | "reject" | "revoke") {
    setErr(null);
    if (kind === "approve" && !grade) {
      setErr("Pick a grade before approving.");
      return;
    }
    if (kind === "revoke") {
      const ok = window.confirm(
        "Revoke this approval?\n\n" +
          "This deletes the player from the pool and resets the registration to PENDING."
      );
      if (!ok) return;
    }

    setLoading(kind);
    const res = await fetch(`/api/registrations/${registrationId}/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade }),
    });
    const body = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      setErr(body.error ?? `Something went wrong (${res.status})`);
      return;
    }
    router.push("/admin/registrations");
    router.refresh();
  }

  const isApproved = currentStatus === "APPROVED";
  const isRejected = currentStatus === "REJECTED";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review decision</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="block text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
              Grade
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              disabled={isApproved}
              className="h-9 w-full rounded-lg bg-[var(--bg-1)] border border-[var(--line-1)] px-3 text-[13px] text-[var(--fg-1)] focus:outline-none focus:border-[var(--accent-line)] disabled:opacity-50"
            >
              <option value="">— select —</option>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => act("approve")}
              loading={loading === "approve"}
              disabled={isApproved || isRejected || loading !== null}
            >
              <Check size={13} strokeWidth={2.5} />
              {isApproved ? "Approved" : "Approve"}
            </Button>

            {isApproved ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => act("revoke")}
                loading={loading === "revoke"}
                disabled={loading !== null}
              >
                <Undo2 size={13} strokeWidth={2} />
                Revoke
              </Button>
            ) : (
              <Button
                variant="danger"
                size="sm"
                onClick={() => act("reject")}
                loading={loading === "reject"}
                disabled={isRejected || loading !== null}
              >
                <X size={13} strokeWidth={2.5} />
                {isRejected ? "Rejected" : "Reject"}
              </Button>
            )}
          </div>
        </div>

        {isApproved && (
          <p className="text-[12px] text-[var(--fg-4)]">
            Revoke deletes the player from the pool. Only possible while the
            player is not in an auction or on a team.
          </p>
        )}

        {err && (
          <div className="text-[13px] rounded-lg p-3 border border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger)]">
            {err}
          </div>
        )}
      </CardBody>
    </Card>
  );
}