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

  // Fetch every pending regular player. We NEVER filter by a caller-supplied
  // grade before calculating which grade comes next: the server owns the order.
  const { data: candidates, error: candidatesError } = await admin
    .from("auction_players")
    .select("id, player_id, players!inner(id, name, grade, image_url, achievements, participation_history, playing_centre, played_mira_bhayandar)")
    .eq("auction_id", id)
    .eq("status", "PENDING");
  if (candidatesError) {
    return NextResponse.json({ error: candidatesError.message }, { status: 500 });
  }

  // Playing captains are reserved for final allotment, not ordinary bidding.
  const { data: reserved, error: reservedError } = await admin.from("teams")
    .select("captain_player_id, co_captain_player_id").eq("auction_id", id);
  if (reservedError) return NextResponse.json({ error: reservedError.message }, { status: 500 });
  const reservedIds = new Set((reserved ?? []).flatMap((t) =>
    [t.captain_player_id, t.co_captain_player_id].filter((v): v is string => !!v)));
  const ordinary = (candidates ?? []).filter((candidate) => !reservedIds.has(candidate.player_id));
  const getGrade = (row: (typeof ordinary)[number]): string | null => {
    const player = Array.isArray(row.players) ? row.players[0] : row.players;
    return player?.grade ?? null;
  };

  // CATEGORY_ORDER is the event's fixed sequence: A+, A1, A2, ... G1.
  // A grade is complete only when no ordinary PENDING player of that grade
  // remains. This restarts at A+ for Round 2 because it has fresh pending rows.
  const activeGrade = CATEGORY_ORDER.find((grade) =>
    ordinary.some((player) => getGrade(player) === grade));
  if (!activeGrade) {
    return NextResponse.json({
      error: "No eligible ordinary players remain. Complete Round 2 before final playing-captain allotment."
    }, { status: 409 });
  }

  // An old UI or custom API caller must not skip ahead to a later category.
  if (category && category !== "ANY" && category !== activeGrade) {
    return NextResponse.json({
      error: `Finish ${activeGrade} before drawing ${category}. Categories must follow the auction sequence.`,
      currentCategory: activeGrade,
    }, { status: 409 });
  }

  // Transactionally close every earlier grade before admitting a new grade.
  // Empty grades are charged at their configured base price. A failed captain
  // charge blocks advancement rather than leaving a partial allotment.
  const { error: captainError } = await userClient.rpc("close_completed_captain_grades", {
    p_auction_id: id,
    p_before_grade: activeGrade,
  });
  if (captainError) return NextResponse.json({
    error: `Playing-captain allotment must complete before ${activeGrade}: ${captainError.message}`
  }, { status: 409 });

  const available = ordinary.filter((player) => getGrade(player) === activeGrade);
  // Draw randomly only WITHIN the current grade.
  const picked = available[Math.floor(Math.random() * available.length)];

  // Claim only a still-pending player. Another auctioneer might have drawn
  // the same player while this request was in flight.
  const { data: claimed, error } = await admin
    .from("auction_players")
    .update({ status: "CURRENT" })
    .eq("id", picked.id)
    .eq("status", "PENDING")
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!claimed) {
    return NextResponse.json({ error: "Player was drawn by another request. Please retry." }, { status: 409 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "PLAYER_DRAWN",
    entity_type: "auction_player",
    entity_id: picked.id,
    payload: { category: activeGrade },
  });

  return NextResponse.json({ ok: true, auctionPlayerId: picked.id, category: activeGrade });
}