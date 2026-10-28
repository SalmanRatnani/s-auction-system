import { Radio, RefreshCw, WifiOff } from "lucide-react";

export function AuctionConnection({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const Icon = loading ? Radio : WifiOff;
  return (
    <section className="auction-connection" role="status" aria-atomic="true">
      <span className="auction-connection-icon" aria-hidden="true">
        <Icon size={24} />
      </span>
      <div>
        <h2>
          {loading
            ? "Connecting to the room"
            : "Auction connection unavailable"}
        </h2>
        <p>
          {loading
            ? "Getting the latest player, bids and team purses…"
            : (error ?? "Please try again in a moment.")}
        </p>
        {!loading && (
          <button type="button" onClick={onRetry} className="auction-retry">
            <RefreshCw size={15} aria-hidden="true" /> Try again
          </button>
        )}
      </div>
    </section>
  );
}
