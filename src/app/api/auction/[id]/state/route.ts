import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORY_ORDER } from "@/constants/categories";
import { isMissingPartnerColumn } from "@/lib/teams-compat";

/** Supabase returns embedded joins as an object OR a one-element array. */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type CurrentPlayer = {
  id: string;
  player_code: string;
  name: string;
  grade: string;
  image_url: string | null;
  achievements: string | null;
  playing_centre: string | null;
  playing_hand: string | null;
};

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
  const { data: rawCurrent } = await admin
    .from("auction_players")
    .select(
      `
      id, status, round, sold_price, sold_to_team_id,
      player:players (
        id, player_code, name, grade, image_url,
        achievements, playing_centre, playing_hand
      )
    `
    )
    .eq("auction_id", id)
    .eq("status", "CURRENT")
    .maybeSingle();

  const currentPlayer = one<CurrentPlayer>(
    rawCurrent?.player as CurrentPlayer | CurrentPlayer[] | null | undefined
  );

  // --- Is the current player a team's playing captain? ---
  let captainTeam: { id: string; name: string } | null = null;
  if (currentPlayer?.id) {
    const { data: team } = await admin
      .from("teams")
      .select("id, name")
      .eq("auction_id", id)
      .eq("captain_player_id", currentPlayer.id)
      .limit(1)
      .maybeSingle();
    captainTeam = team ?? null;
  }

  const current = rawCurrent
    ? { ...rawCurrent, player: currentPlayer, captainTeam }
    : null;

  // --- Highest non-undone bid for that player ---
  let highestBid: {
    id: string;
    amount: number;
    team_id: string;
    created_at: string;
  } | null = null;

  if (rawCurrent) {
    const { data: bids } = await admin
      .from("bids")
      .select("id, amount, team_id, created_at")
      .eq("auction_player_id", rawCurrent.id)
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
  (pending ?? []).forEach((row) => {
    const p = one<{ grade: string }>(
      row.players as { grade: string } | { grade: string }[] | null
    );
    if (p?.grade) counts[p.grade] = (counts[p.grade] ?? 0) + 1;
  });

  // --- Teams ---
  const fullTeams = await admin.from("teams")
    .select("id, name, logo_url, captain_user_id, co_captain_user_id, initial_purse")
    .eq("auction_id", id).order("created_at", { ascending: true });
  const fallback = isMissingPartnerColumn(fullTeams.error)
    ? await admin.from("teams")
        .select("id, name, logo_url, captain_user_id, initial_purse")
        .eq("auction_id", id).order("created_at", { ascending: true })
    : null;
  const teamsError = fallback?.error ?? (fallback ? null : fullTeams.error);
  if (teamsError) return NextResponse.json({ error: teamsError.message }, { status: 500 });
  const teamsRaw = fallback
    ? (fallback.data ?? []).map((team) => ({ ...team, co_captain_user_id: null }))
    : fullTeams.data ?? [];

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

  // --- Which categories each team has already won ---
  // Powers the "one player per category per team" rule in the bid UI.
  const { data: rosters } = await admin
    .from("team_players")
    .select(`team_id, player:players (grade)`)
    .eq("auction_id", id);

  const gradesByTeam: Record<string, string[]> = {};
  (rosters ?? []).forEach((r) => {
    const p = one<{ grade: string | null }>(
      r.player as { grade: string | null } | { grade: string | null }[] | null
    );
    if (!p?.grade) return;
    (gradesByTeam[r.team_id] ??= []).push(p.grade);
  });

  // --- Most recent sale (drives the SOLD celebration on every screen) ---
  const { data: lastTp } = await admin
    .from("team_players")
    .select(
      `id, price, acquired_via, won_at,
       player:players (name, grade, image_url),
       team:teams (name)`
    )
    .eq("auction_id", id)
    .order("won_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let lastSale: {
    id: string;
    price: number;
    acquired_via: string;
    won_at: string;
    player_name: string;
    grade: string | null;
    image_url: string | null;
    team_name: string;
  } | null = null;

  if (lastTp) {
    const lp = one<{ name: string; grade: string | null; image_url: string | null }>(
      lastTp.player as
        | { name: string; grade: string | null; image_url: string | null }
        | { name: string; grade: string | null; image_url: string | null }[]
        | null
    );
    const lt = one<{ name: string }>(
      lastTp.team as { name: string } | { name: string }[] | null
    );
    if (lp && lt) {
      lastSale = {
        id: lastTp.id,
        price: Number(lastTp.price),
        acquired_via: lastTp.acquired_via,
        won_at: lastTp.won_at,
        player_name: lp.name,
        grade: lp.grade,
        image_url: lp.image_url,
        team_name: lt.name,
      };
    }
  }

  // Purse is only exposed to authenticated users.
  // Public viewers get a copy with purses zeroed out.
  const teams = (teamsRaw ?? []).map((t) => {
    const purse = purseByTeam[t.id];
    return {
      id: t.id,
      name: t.name,
      logo_url: t.logo_url,
      captain_user_id: t.captain_user_id,
      co_captain_user_id: t.co_captain_user_id,
      initial_purse: isAuthed ? t.initial_purse : 0,
      remaining_purse: isAuthed
        ? purse?.remaining_purse ?? t.initial_purse
        : 0,
      spent: isAuthed ? purse?.spent ?? 0 : 0,
      squad_count: purse?.squad_count ?? 0,
      won_grades: gradesByTeam[t.id] ?? [],
    };
  });

  return NextResponse.json({
    auction,
    current,
    highestBid,
    counts,
    lastSale,
    teams,
  });
}
