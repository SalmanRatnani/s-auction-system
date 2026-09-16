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
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function act(kind: "approve" | "reject") {
    setErr(null);
    if (kind === "approve" && !grade) {
      setErr("Pick a grade before approving.");
      return;
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
      setErr(body.error ?? "Something went wrong");
      return;
    }
    router.push("/admin/registrations");
    router.refresh();
  }

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
            <Select value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">— select —</option>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => act("approve")}
              loading={loading === "approve"}
              disabled={currentStatus === "APPROVED" || loading !== null}
            >
              Approve & add to pool
            </Button>
            <Button
              variant="danger"
              onClick={() => act("reject")}
              loading={loading === "reject"}
              disabled={currentStatus === "REJECTED" || loading !== null}
            >
              Reject
            </Button>
          </div>
        </div>

        {err && (
          <div className="text-sm rounded-lg p-3 border bg-red-500/10 border-red-500/30 text-red-300">
            {err}
          </div>
        )}
      </CardBody>
    </Card>
  );
}