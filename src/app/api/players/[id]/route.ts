import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
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

  const { data: player } = await admin
    .from("players")
    .select("id, registration_id, status")
    .eq("id", id)
    .single();
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // --- HARD BLOCK: player is on a team roster ---
  const { count: teamCount } = await admin
    .from("team_players")
    .select("id", { count: "exact", head: true })
    .eq("player_id", id);
  if ((teamCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "Player is on a team roster. Reset the auction first, then delete.",
      },
      { status: 409 }
    );
  }

  // --- SOFT BLOCK: player is CURRENTLY on the block in a live auction ---
  const { data: ap } = await admin
    .from("auction_players")
    .select("id, status, auction_id")
    .eq("player_id", id)
    .maybeSingle();

  if (ap) {
    // Check if the auction is LIVE — if so, don't allow deleting CURRENT
    const { data: auction } = await admin
      .from("auctions")
      .select("status")
      .eq("id", ap.auction_id)
      .single();

    if (ap.status === "CURRENT" && auction?.status === "LIVE") {
      return NextResponse.json(
        { error: "Player is currently on the block. Sell or mark unsold first." },
        { status: 409 }
      );
    }

    // Otherwise — clean up the queue row + any bids. Handles stale SOLD
    // states left over from a broken reset (no team_players row exists,
    // so it's safe to wipe).
    await admin.from("bids").delete().eq("auction_player_id", ap.id);
    await admin.from("auction_players").delete().eq("id", ap.id);
  }

  // --- Also delete any stray bids ---
  const { data: allAPs } = await admin
    .from("auction_players")
    .select("id")
    .eq("player_id", id);
  const apIds = (allAPs ?? []).map((r) => r.id);
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
    payload: { cleaned_auction_players: apIds.length },
  });

  return NextResponse.json({ ok: true, cleaned: apIds.length });
}