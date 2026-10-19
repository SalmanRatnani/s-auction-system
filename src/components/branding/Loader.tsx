import { Gavel } from "lucide-react";

export function Loader({
  label = "Preparing the arena",
  fullScreen = false,
  compact = false,
}: {
  label?: string;
  fullScreen?: boolean;
  compact?: boolean;
}) {
  if (compact) {
    return <span role="status" aria-label={label} className="inline-block h-4 w-4 rounded-full border-[1.5px] border-[var(--accent-line)] border-t-[var(--accent)] animate-spin-slow" />;
  }
  return (
    <div role="status" aria-live="polite" aria-label={label} className={`auction-loader-shell ${fullScreen ? "auction-loader-full" : ""}`}>
      <div className="auction-loader-mark">
        <span className="auction-loader-icon"><Gavel size={27} strokeWidth={1.5} /></span>
      </div>
      <div className="space-y-2">
        <div className="auction-loader-name">S AUCTION</div>
        <div className="auction-loader-subtitle">{label}</div>
      </div>
      <div className="auction-loader-track" aria-hidden="true"><span /></div>
      <span className="sr-only">Loading, please wait</span>
    </div>
  );
}
