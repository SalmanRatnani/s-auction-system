import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Never authorize public snapshots by auction UUID alone. */
export async function validateViewerToken(token: string, auctionId: string) {
  if (!/^[a-z0-9]{32}$/.test(token)) return false;
  const admin = createAdminClient();
  const { data, error } = await admin.from("viewer_links")
    .select("id")
    .eq("token", token)
    .eq("auction_id", auctionId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return !error && !!data;
}
