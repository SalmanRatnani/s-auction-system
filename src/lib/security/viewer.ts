import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Bearer links authorize one auction only, and stop working when login is required. */
export async function validateViewerToken(token: string, auctionId: string) {
  if (!/^[a-z0-9]{32}$/.test(token)) return false;
  const { data, error } = await createAdminClient()
    .from("viewer_links")
    .select("id, auction:auctions!inner(config)")
    .eq("token", token)
    .eq("auction_id", auctionId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return false;
  const auction = Array.isArray(data.auction) ? data.auction[0] : data.auction;
  return auction?.config?.viewerMode !== "LOGIN_REQUIRED";
}
