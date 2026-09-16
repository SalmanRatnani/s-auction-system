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

  // Find current player
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

  // Call the RPC with the user's session (checks staff role + does the sale atomically)
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sell_player", {
    p_auction_player_id: current.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, sale: data });
}