import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { INITIAL_PURSE_PAISE } from "@/constants/categories";

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

  // 1) Capture player_ids BEFORE we delete auction_players
  const { data: aps, error: apErr } = await admin
    .from("auction_players")
    .select("player_id")
    .eq("auction_id", id);
  if (apErr) return NextResponse.json({ error: apErr.message }, { status: 500 });
  const playerIds = (aps ?? []).map((r) => r.player_id);

  // 2) Delete in FK-safe order — abort on any failure
  const r1 = await admin.from("purse_ledger").delete().eq("auction_id", id);
  if (r1.error) {
    return NextResponse.json(
      { error: `Reset failed while clearing purse_ledger: ${r1.error.message}` },
      { status: 500 }
    );
  }

  const r2 = await admin.from("bids").delete().eq("auction_id", id);
  if (r2.error) {
    return NextResponse.json(
      { error: `Reset failed while clearing bids: ${r2.error.message}` },
      { status: 500 }
    );
  }

  const r3 = await admin.from("team_players").delete().eq("auction_id", id);
  if (r3.error) {
    return NextResponse.json(
      { error: `Reset failed while clearing team_players: ${r3.error.message}` },
      { status: 500 }
    );
  }

  const r4 = await admin.from("auction_players").delete().eq("auction_id", id);
  if (r4.error) {
    return NextResponse.json(
      { error: `Reset failed while clearing auction_players: ${r4.error.message}` },
      { status: 500 }
    );
  }

  // 3) Reset ONLY players from this auction back to IN_POOL
  if (playerIds.length > 0) {
    const { error: pErr } = await admin
      .from("players")
      .update({ status: "IN_POOL" })
      .in("id", playerIds)
      .neq("status", "WITHDRAWN");
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  // 4) Reset purses to ₹1 Cr — use the constant, don't hardcode
  const { error: tErr } = await admin
    .from("teams")
    .update({ initial_purse: INITIAL_PURSE_PAISE })
    .eq("auction_id", id);
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  // 5) Flip auction back to DRAFT
  const { error: aErr } = await admin
    .from("auctions")
    .update({ status: "DRAFT", started_at: null, ended_at: null })
    .eq("id", id);
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  // 6) Audit
  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "AUCTION_RESET",
    entity_type: "auction",
    entity_id: id,
    payload: {
      cleared_players: playerIds.length,
      purse_reset_to: INITIAL_PURSE_PAISE,
      note: "Full reset — bids, rosters, auction_players wiped",
    },
  });

  return NextResponse.json({ ok: true, cleared: playerIds.length });
}