/** Missing deployment dependencies must fail closed, never use legacy writes. */
export function isAuctionSetupError(error: { code?: string }) {
  return ["PGRST202", "PGRST204", "42P01", "42703", "42883"].includes(
    error.code ?? "",
  );
}

export const AUCTION_SETUP_MESSAGE =
  "This auction is temporarily unavailable while the organizer completes setup. Please try again later.";

/** Only known response codes become UI copy; database details stay on the server. */
export function auctionStateError(status: number, code?: unknown): string {
  if (status === 401 || status === 403)
    return "Your auction access has expired. Sign in again or request a new viewer link.";
  if (status === 404) return "This auction is no longer available.";
  if (status === 503 && code === "AUCTION_SETUP_REQUIRED")
    return AUCTION_SETUP_MESSAGE;
  return "Live updates are unavailable. Check your connection and try again.";
}
