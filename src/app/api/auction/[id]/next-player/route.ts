import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_ORDER, type Category } from "@/constants/categories";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth + role
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient
    .from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "MAIN_CONTROLLER" && profile?.role !== "AUCTIONEER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { category } = (await request.json().catch(() => ({}))) as {
    category?: string;
  };

  if (category && category !== "ANY" && !CATEGORY_ORDER.includes(category as Category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Auction must be LIVE
  const { data: auction } = await admin
    .from("auctions").select("status").eq("id", id).single();
  if (!auction) return NextResponse.json({ error: "Auction not found" }, { status: 404 });
  if (auction.status !== "LIVE") {
    return NextResponse.json(
      { error: "Auction is not LIVE. Start it first." },
      { status: 409 }
    );
  }

  // Guard: no CURRENT player already on the block
  const { data: existing } = await admin
    .from("auction_players")
    .select("id")
    .eq("auction_id", id)
    .eq("status", "CURRENT")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "A player is already on the block. Sell or mark unsold first." },
      { status: 409 }
    );
  }

  // Find a random PENDING player (optionally filtered by grade)
  // We join through players table to filter by grade.
  let query = admin
    .from("auction_players")
    .select("id, player_id, players!inner(id, name, grade, image_url, achievements, participation_history, playing_centre, played_mira_bhayandar)")
    .eq("auction_id", id)
    .eq("status", "PENDING");

  if (category && category !== "ANY") {
    query = query.eq("players.grade", category);
  }

  const { data: candidates } = await query;

  if (!candidates || candidates.length === 0) {
    return NextResponse.json(
      { error: `No pending players in ${category === "ANY" ? "any category" : category}` },
      { status: 404 }
    );
  }

  // Pick one at random
  const picked = candidates[Math.floor(Math.random() * candidates.length)];

  // Set as CURRENT
  const { error } = await admin
    .from("auction_players")
    .update({ status: "CURRENT" })
    .eq("id", picked.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "PLAYER_DRAWN",
    entity_type: "auction_player",
    entity_id: picked.id,
    payload: { category: category ?? "ANY" },
  });

  return NextResponse.json({ ok: true, auctionPlayerId: picked.id });
}