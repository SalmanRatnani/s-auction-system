"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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
  const [loading, setLoading] = useState<"approve" | "reject" | "revoke" | null>(null);
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
          "This deletes the player from the pool and resets the registration to PENDING.\n" +
          "Only possible if the player hasn't been added to an auction or team yet."
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
          <div className="flex-1">
            <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">
              Grade
            </label>
            <Select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              disabled={isApproved}
            >
              <option value="">— select —</option>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => act("approve")}
              loading={loading === "approve"}
              disabled={isApproved || isRejected || loading !== null}
            >
              {isApproved ? "Approved" : "Approve & add to pool"}
            </Button>

            {isApproved ? (
              <Button
                variant="outline"
                onClick={() => act("revoke")}
                loading={loading === "revoke"}
                disabled={loading !== null}
              >
                Revoke approval
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={() => act("reject")}
                loading={loading === "reject"}
                disabled={isRejected || loading !== null}
              >
                {isRejected ? "Rejected" : "Reject"}
              </Button>
            )}
          </div>
        </div>

        {isApproved && (
          <p className="text-xs text-white/40">
            Revoke will delete the player from the pool. Only possible while the
            player is not yet in an auction or on a team.
          </p>
        )}

        {err && (
          <div className="text-sm rounded-lg p-3 border bg-red-500/10 border-red-500/30 text-red-300">
            {err}
          </div>
        )}
      </CardBody>
    </Card>
  );
}