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

  // Get all UNSOLD auction_players for round 1
  const { data: unsold } = await admin
    .from("auction_players")
    .select("id, player_id, round, order_index")
    .eq("auction_id", id)
    .eq("status", "UNSOLD");

  if (!unsold || unsold.length === 0) {
    return NextResponse.json({ error: "No unsold players to re-queue" }, { status: 409 });
  }

  // Reset the round-1 rows back to PENDING (round stays 1)
  const rowIds = unsold.map((r) => r.id);
  const { error: upErr } = await admin
    .from("auction_players")
    .update({ status: "PENDING" })
    .in("id", rowIds);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Reset player status from UNSOLD back to IN_POOL
  const playerIds = unsold.map((r) => r.player_id);
  await admin
    .from("players")
    .update({ status: "IN_POOL" })
    .in("id", playerIds);

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "ROUND2_STARTED",
    entity_type: "auction",
    entity_id: id,
    payload: { requeued: unsold.length },
  });

  return NextResponse.json({ ok: true, requeued: unsold.length });
}