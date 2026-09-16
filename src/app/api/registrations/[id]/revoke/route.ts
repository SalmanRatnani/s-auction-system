import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth
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

  // Load the registration
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

  // Find the player created from this registration
  const { data: player } = await admin
    .from("players")
    .select("id, status")
    .eq("registration_id", id)
    .maybeSingle();

  if (player) {
    // Guard: block if player is already in an auction queue or on a team
    const { count: auctionCount } = await admin
      .from("auction_players")
      .select("id", { count: "exact", head: true })
      .eq("player_id", player.id);

    const { count: teamCount } = await admin
      .from("team_players")
      .select("id", { count: "exact", head: true })
      .eq("player_id", player.id);

    if ((auctionCount ?? 0) > 0 || (teamCount ?? 0) > 0 || player.status === "SOLD") {
      return NextResponse.json(
        { error: "Cannot revoke — player is already in an auction or team" },
        { status: 409 }
      );
    }

    // Delete the player row
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

  // Audit
  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "REGISTRATION_REVOKED",
    entity_type: "registration",
    entity_id: id,
    payload: { deleted_player_id: player?.id ?? null },
  });

  return NextResponse.json({ ok: true });
}