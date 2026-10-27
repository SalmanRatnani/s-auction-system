import { formatINR } from "@/lib/utils";

export function PurseMeter({
  available,
  total,
  label = "Available purse",
}: {
  available: number;
  total: number;
  label?: string;
}) {
  const maximum = Number.isFinite(total) && total > 0 ? total : 0;
  const value = Number.isFinite(available)
    ? Math.max(0, Math.min(maximum, available))
    : 0;
  const fraction = maximum ? value / maximum : 0;
  return (
    <div className="purse-meter" data-low={fraction < 0.2}>
      <div
        className="purse-rail"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={maximum || 1}
        aria-valuenow={value}
        aria-valuetext={`${formatINR(value)} of ${formatINR(maximum)} virtual credits`}
      >
        <span style={{ width: `${fraction * 100}%` }} />
      </div>
      <div className="purse-caption">
        <span>{label}</span>
        <span>{Math.round(fraction * 100)}%</span>
      </div>
    </div>
  );
}
