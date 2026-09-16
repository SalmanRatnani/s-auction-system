import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient
    .from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "MAIN_CONTROLLER" && profile?.role !== "AUCTIONEER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: current } = await admin
    .from("auction_players")
    .select("id")
    .eq("auction_id", id)
    .eq("status", "CURRENT")
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ error: "No player on the block" }, { status: 409 });
  }

  // Find the most recent non-undone bid
  const { data: lastBid } = await admin
    .from("bids")
    .select("id, amount, team_id, captain_user_id")
    .eq("auction_player_id", current.id)
    .eq("is_undone", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastBid) {
    return NextResponse.json({ error: "No bids to undo" }, { status: 409 });
  }

  await admin.from("bids").update({ is_undone: true }).eq("id", lastBid.id);

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "BID_UNDONE",
    entity_type: "bid",
    entity_id: lastBid.id,
    payload: { auction_player_id: current.id, amount: lastBid.amount },
  });

  return NextResponse.json({ ok: true, undone: lastBid });
}