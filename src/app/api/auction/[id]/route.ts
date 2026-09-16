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
  if (profile?.role !== "MAIN_CONTROLLER" && profile?.role !== "AUCTIONEER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: current } = await admin
    .from("auction_players")
    .select("id, player_id")
    .eq("auction_id", id)
    .eq("status", "CURRENT")
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ error: "No player on the block" }, { status: 409 });
  }

  await admin
    .from("auction_players")
    .update({ status: "UNSOLD" })
    .eq("id", current.id);

  await admin
    .from("players")
    .update({ status: "UNSOLD" })
    .eq("id", current.player_id);

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "PLAYER_UNSOLD",
    entity_type: "auction_player",
    entity_id: current.id,
  });

  return NextResponse.json({ ok: true });
}