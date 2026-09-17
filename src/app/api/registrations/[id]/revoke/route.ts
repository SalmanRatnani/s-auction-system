import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
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

  const { data: reg } = await admin
    .from("registrations")
    .select("id, status")
    .eq("id", id)
    .single();
  if (!reg) return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  if (reg.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Only approved registrations can be revoked" },
      { status: 409 }
    );
  }

  const { data: player } = await admin
    .from("players")
    .select("id")
    .eq("registration_id", id)
    .maybeSingle();

  if (player) {
    // Hard block: on a team roster
    const { count: teamCount } = await admin
      .from("team_players")
      .select("id", { count: "exact", head: true })
      .eq("player_id", player.id);
    if ((teamCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "Player is on a team roster. Reset the auction first." },
        { status: 409 }
      );
    }

    // Clean up any auction_players + bids
    const { data: aps } = await admin
      .from("auction_players")
      .select("id")
      .eq("player_id", player.id);
    const apIds = (aps ?? []).map((r) => r.id);
    if (apIds.length > 0) {
      await admin.from("bids").delete().in("auction_player_id", apIds);
      await admin.from("auction_players").delete().in("id", apIds);
    }

    // Delete the player
    const { error: delErr } = await admin
      .from("players")
      .delete()
      .eq("id", player.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // Reset the registration
  const { error: updErr } = await admin
    .from("registrations")
    .update({ status: "PENDING", reviewed_by: null, reviewed_at: null })
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "REGISTRATION_REVOKED",
    entity_type: "registration",
    entity_id: id,
    payload: { deleted_player_id: player?.id ?? null },
  });

  return NextResponse.json({ ok: true });
}