// src/lib/auction.ts
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Auction = {
  id: string;
  name: string;
  mode: "DRY_RUN" | "LIVE";
  status: "DRAFT" | "LIVE" | "PAUSED" | "ENDED";
  config: Record<string, unknown>;
  state_version: number;
  created_by: string | null;
};

/** Returns the current DRAFT or LIVE auction, creating a DRAFT if none exists. */
export async function getOrCreateDraftAuction(): Promise<Auction | null> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("auctions")
    .select("*")
    .in("status", ["DRAFT", "LIVE", "PAUSED"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as Auction;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "MAIN_CONTROLLER") return null;

  // Client-side INSERT is intentionally revoked by migration 0024.
  const { data: created, error } = await createAdminClient()
    .from("auctions")
    .insert({
      name: `S Auction ${new Date().getFullYear()}`,
      mode: "DRY_RUN",
      status: "DRAFT",
      config: {},
      created_by: user?.id ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[getOrCreateDraftAuction]", error);
    return null;
  }
  return created as Auction;
}
