import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "MAIN_CONTROLLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: player } = await admin
    .from("players")
    .select("id, name, registration_id")
    .eq("id", id)
    .single();
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // --- Roster check: block ONLY if any row belongs to a LIVE/PAUSED auction ---
  const { data: teamRows } = await admin
    .from("team_players")
    .select("id, auction_id, auctions!inner(status)")
    .eq("player_id", id);

  const liveBlocks = (teamRows ?? []).filter((r) => {
    const a = Array.isArray(r.auctions) ? r.auctions[0] : r.auctions;
    return a?.status === "LIVE" || a?.status === "PAUSED";
  });

  if (liveBlocks.length > 0) {
    return NextResponse.json(
      {
        error:
          "Player is on a team in a LIVE auction. End the auction first, then delete.",
      },
      { status: 409 }
    );
  }

  // Safe to clean up: remove roster rows from stale/ended/draft auctions
  if ((teamRows ?? []).length > 0) {
    await admin.from("team_players").delete().eq("player_id", id);
  }

  // --- CURRENT-on-block check (live auction only) ---
  const { data: aps } = await admin
    .from("auction_players")
    .select("id, status, auction_id, auctions!inner(status)")
    .eq("player_id", id);

  const currentOnLive = (aps ?? []).find((r) => {
    const a = Array.isArray(r.auctions) ? r.auctions[0] : r.auctions;
    return r.status === "CURRENT" && a?.status === "LIVE";
  });

  if (currentOnLive) {
    return NextResponse.json(
      { error: "Player is currently on the block. Sell or mark unsold first." },
      { status: 409 }
    );
  }

  // --- Clean up ALL auction_players + bids for this player ---
  const apIds = (aps ?? []).map((r) => r.id);
  if (apIds.length > 0) {
    await admin.from("bids").delete().in("auction_player_id", apIds);
    await admin.from("auction_players").delete().in("id", apIds);
  }

  // --- Delete the player ---
  const { error } = await admin.from("players").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // --- Reset the linked registration back to PENDING ---
  if (player.registration_id) {
    await admin
      .from("registrations")
      .update({ status: "PENDING", reviewed_by: null, reviewed_at: null })
      .eq("id", player.registration_id);
  }

  // --- Audit ---
  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "PLAYER_DELETED",
    entity_type: "player",
    entity_id: id,
    payload: {
      name: player.name,
      cleared_team_rows: teamRows?.length ?? 0,
      cleared_auction_players: apIds.length,
    },
  });

  return NextResponse.json({ ok: true });
}