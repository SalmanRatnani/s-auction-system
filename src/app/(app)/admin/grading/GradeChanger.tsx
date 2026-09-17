"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_ORDER } from "@/constants/categories";

export function GradeChanger({
  playerId,
  currentGrade,
}: {
  playerId: string;
  currentGrade: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function change(next: string) {
    if (next === currentGrade) return;
    setSaving(true);
    await fetch(`/api/players/${playerId}/grade`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade: next }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <select
  className="bg-[var(--bg-2)] border border-[var(--line-1)] rounded text-[11px] px-1.5 py-0.5 text-[var(--fg-1)] tnum focus:outline-none focus:border-[var(--accent-line)]"
  value={currentGrade ?? ""}
  disabled={saving}
  onChange={(e) => change(e.target.value)}
>
  <option value="" disabled>—</option>
  {CATEGORY_ORDER.map((c) => (
    <option key={c} value={c}>
      {c}
    </option>
  ))}
</select>
  );
}