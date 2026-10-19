"use client";

import { useCountUp } from "@/hooks/useCountUp";
import { formatINR } from "@/lib/utils";

/** Rolls a paise amount smoothly from its previous value to the new one. */
export function AnimatedAmount({
  value,
  compact = true,
  durationMs = 650,
  className,
}: {
  value: number;
  compact?: boolean;
  durationMs?: number;
  className?: string;
}) {
  const shown = useCountUp(value, durationMs);
  return <span className={className}>{formatINR(shown, { compact })}</span>;
}
