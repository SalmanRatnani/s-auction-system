"use client";

import { useEffect, useRef, useState } from "react";
import { useCountUp } from "@/hooks/useCountUp";
import { formatINR } from "@/lib/utils";

export function AnimatedBid({
  amount,
  compact = false,
  className = "",
}: {
  amount: number;
  compact?: boolean;
  className?: string;
}) {
  const displayed = useCountUp(amount, 600);
  const [flash, setFlash] = useState(false);
  const last = useRef(amount);

  useEffect(() => {
    if (amount !== last.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 900);
      last.current = amount;
      return () => clearTimeout(t);
    }
  }, [amount]);

  return (
    <span
      className={`tabular-nums ${flash ? "animate-bid-flash" : ""} ${className}`}
    >
      {formatINR(displayed, { compact })}
    </span>
  );
}