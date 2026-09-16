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
      className="bg-white/5 border border-white/10 rounded text-xs px-1 py-0.5 text-white"
      value={currentGrade}
      disabled={saving}
      onChange={(e) => change(e.target.value)}
    >
      {CATEGORY_ORDER.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}