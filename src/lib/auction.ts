// src/lib/auction.ts
import { createClient } from "@/lib/supabase/server";

export type Auction = {
  id: string;
  name: string;
  mode: "DRY_RUN" | "LIVE";
  status: "DRAFT" | "LIVE" | "PAUSED" | "ENDED";
  config: Record<string, unknown>;
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

  const { data: created, error } = await supabase
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