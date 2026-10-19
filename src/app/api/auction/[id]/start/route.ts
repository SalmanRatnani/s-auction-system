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
  if (profile?.role !== "MAIN_CONTROLLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: auction } = await admin
    .from("auctions").select("*").eq("id", id).single();
  if (!auction) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (auction.status !== "DRAFT") {
    return NextResponse.json({ error: "Only DRAFT auctions can start. Resume paused auctions instead." }, { status: 409 });
  }

  // Guard: need exactly 6 teams
  const { count: teamCount } = await admin
    .from("teams").select("id", { count: "exact", head: true })
    .eq("auction_id", id);
  if ((teamCount ?? 0) !== 6) {
    return NextResponse.json(
      { error: `Need exactly 6 teams (have ${teamCount ?? 0})` },
      { status: 409 }
    );
  }

  // Guard: need approved players
  const { count: playerCount } = await admin
    .from("players").select("id", { count: "exact", head: true })
    .eq("status", "IN_POOL");
  if ((playerCount ?? 0) === 0) {
    return NextResponse.json(
      { error: "No players in pool. Approve registrations first." },
      { status: 409 }
    );
  }

  // Seed only ordinary players. Both reserved playing captains are allotted last.
  const { data: allPlayers } = await admin
    .from("players").select("id").eq("status", "IN_POOL");
  const { data: capTeams, error: capErr } = await admin.from("teams")
    .select("captain_player_id, co_captain_player_id").eq("auction_id", id);
  if (capErr) return NextResponse.json({ error: capErr.message }, { status: 500 });
  const reserved = new Set((capTeams ?? []).flatMap((t) =>
    [t.captain_player_id, t.co_captain_player_id].filter((v): v is string => !!v)));
  const players = (allPlayers ?? []).filter((p) => !reserved.has(p.id));

  if (players && players.length > 0) {
    const rows = players.map((p, idx) => ({
      auction_id: id,
      player_id: p.id,
      round: 1,
      status: "PENDING" as const,
      order_index: idx,
    }));

    const { error: seedErr } = await admin
      .from("auction_players")
      .upsert(rows, { onConflict: "auction_id,player_id,round", ignoreDuplicates: true });
    if (seedErr) {
      return NextResponse.json({ error: seedErr.message }, { status: 500 });
    }
  }

  const { error } = await admin
    .from("auctions")
    .update({ status: "LIVE", started_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "AUCTION_STARTED",
    entity_type: "auction",
    entity_id: id,
    payload: { seeded_players: players?.length ?? 0 },
  });

  return NextResponse.json({ ok: true, seeded: players?.length ?? 0 });
}
