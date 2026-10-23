import { formatINR } from "@/lib/utils";

/** Highlight an update while displaying its exact value immediately. */
export function AnimatedAmount({
  value,
  compact = true,
  className,
}: {
  value: number;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={className}>
      <span key={value} className="amount-update">
        {formatINR(value, { compact })}
      </span>
    </span>
  );
}
