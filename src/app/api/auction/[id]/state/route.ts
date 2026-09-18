import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORY_ORDER } from "@/constants/categories";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Detect whether the caller is authenticated
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  const isAuthed = !!user;

  // Use admin client so public viewers (no session) can read.
  // RLS is bypassed; we filter fields below instead.
  const admin = createAdminClient();

  const { data: auction } = await admin
    .from("auctions")
    .select("*")
    .eq("id", id)
    .single();

  if (!auction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // --- Current player on the block ---
  const { data: current } = await admin
    .from("auction_players")
    .select(
      `
      id, status, round, sold_price, sold_to_team_id,
      player:players (
        id, player_code, name, grade, image_url,
        achievements, participation_history, playing_centre, played_mira_bhayandar
      )
    `
    )
    .eq("auction_id", id)
    .eq("status", "CURRENT")
    .maybeSingle();

  // --- Highest non-undone bid for that player ---
  let highestBid: {
    id: string;
    amount: number;
    team_id: string;
    created_at: string;
  } | null = null;

  if (current) {
    const { data: bids } = await admin
      .from("bids")
      .select("id, amount, team_id, created_at")
      .eq("auction_player_id", current.id)
      .eq("is_undone", false)
      .order("amount", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);
    highestBid = bids?.[0] ?? null;
  }

  // --- Pool counts by category ---
  const { data: pending } = await admin
    .from("auction_players")
    .select("players!inner(grade)")
    .eq("auction_id", id)
    .eq("status", "PENDING");

  const counts: Record<string, number> = {};
  CATEGORY_ORDER.forEach((c) => (counts[c] = 0));
  (pending ?? []).forEach(
    (row: { players: { grade: string } | { grade: string }[] }) => {
      const p = Array.isArray(row.players) ? row.players[0] : row.players;
      if (p?.grade) counts[p.grade] = (counts[p.grade] ?? 0) + 1;
    }
  );

  // --- Teams ---
  const { data: teamsRaw } = await admin
    .from("teams")
    .select("id, name, logo_url, captain_user_id, initial_purse")
    .eq("auction_id", id)
    .order("created_at", { ascending: true });

  const { data: purses } = await admin
    .from("team_purses")
    .select("team_id, remaining_purse, spent, squad_count")
    .eq("auction_id", id);

  const purseByTeam: Record<
    string,
    { remaining_purse: number; spent: number; squad_count: number }
  > = {};
  (purses ?? []).forEach((p) => {
    purseByTeam[p.team_id] = {
      remaining_purse: Number(p.remaining_purse ?? 0),
      spent: Number(p.spent ?? 0),
      squad_count: Number(p.squad_count ?? 0),
    };
  });

  // Purse is only exposed to authenticated users.
  // Public viewers get a copy with purses zeroed out.
  const teams = (teamsRaw ?? []).map((t) => {
    const purse = purseByTeam[t.id];
    return {
      id: t.id,
      name: t.name,
      logo_url: t.logo_url,
      captain_user_id: t.captain_user_id,
      initial_purse: isAuthed ? t.initial_purse : 0,
      remaining_purse: isAuthed
        ? purse?.remaining_purse ?? t.initial_purse
        : 0,
      spent: isAuthed ? purse?.spent ?? 0 : 0,
      squad_count: purse?.squad_count ?? 0,
    };
  });

  return NextResponse.json({
    auction,
    current,
    highestBid,
    counts,
    teams,
  });
}