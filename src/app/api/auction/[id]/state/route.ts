import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_ORDER } from "@/constants/categories";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: auction } = await supabase
    .from("auctions").select("*").eq("id", id).single();
  if (!auction) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Current player on block (with full player data)
  const { data: current } = await supabase
    .from("auction_players")
    .select(`
      id, status, round, sold_price, sold_to_team_id,
      player:players (
        id, player_code, name, grade, image_url,
        achievements, participation_history, playing_centre, played_mira_bhayandar
      )
    `)
    .eq("auction_id", id)
    .eq("status", "CURRENT")
    .maybeSingle();

  // Highest current bid for that player
  let highestBid = null;
  if (current) {
    const { data: bids } = await supabase
      .from("bids")
      .select("id, amount, team_id, created_at")
      .eq("auction_player_id", current.id)
      .eq("is_undone", false)
      .order("amount", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);
    highestBid = bids?.[0] ?? null;
  }

  // Pool counts by category
  const { data: pending } = await supabase
    .from("auction_players")
    .select("players!inner(grade)")
    .eq("auction_id", id)
    .eq("status", "PENDING");

  const counts: Record<string, number> = {};
  CATEGORY_ORDER.forEach((c) => (counts[c] = 0));
  (pending ?? []).forEach((row: { players: { grade: string } | { grade: string }[] }) => {
    const p = Array.isArray(row.players) ? row.players[0] : row.players;
    if (p?.grade) counts[p.grade] = (counts[p.grade] ?? 0) + 1;
  });

  return NextResponse.json({
    auction,
    current,
    highestBid,
    counts,
  });
}