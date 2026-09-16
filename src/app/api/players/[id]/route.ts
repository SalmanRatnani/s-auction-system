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
    .select("id, registration_id, status")
    .eq("id", id)
    .single();

  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  // Guards
  const { count: auctionCount } = await admin
    .from("auction_players")
    .select("id", { count: "exact", head: true })
    .eq("player_id", id);

  const { count: teamCount } = await admin
    .from("team_players")
    .select("id", { count: "exact", head: true })
    .eq("player_id", id);

  if ((auctionCount ?? 0) > 0 || (teamCount ?? 0) > 0 || player.status === "SOLD") {
    return NextResponse.json(
      { error: "Cannot delete — player is already in an auction or team" },
      { status: 409 }
    );
  }

  const { error } = await admin.from("players").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Reset the linked registration back to PENDING
  if (player.registration_id) {
    await admin
      .from("registrations")
      .update({ status: "PENDING", reviewed_by: null, reviewed_at: null })
      .eq("id", player.registration_id);
  }

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "PLAYER_DELETED",
    entity_type: "player",
    entity_id: id,
  });

  return NextResponse.json({ ok: true });
}