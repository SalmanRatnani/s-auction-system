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

  // 1) Capture player_ids BEFORE we delete auction_players
  const { data: aps, error: apErr } = await admin
    .from("auction_players")
    .select("player_id")
    .eq("auction_id", id);
  if (apErr) return NextResponse.json({ error: apErr.message }, { status: 500 });
  const playerIds = (aps ?? []).map((r) => r.player_id);

  // 2) Delete in FK-safe order — abort on any failure
  const steps: Array<[string, () => Promise<{ error: unknown }>]> = [
    ["purse_ledger",   () => admin.from("purse_ledger").delete().eq("auction_id", id)],
    ["bids",           () => admin.from("bids").delete().eq("auction_id", id)],
    ["team_players",   () => admin.from("team_players").delete().eq("auction_id", id)],
    ["auction_players",() => admin.from("auction_players").delete().eq("auction_id", id)],
  ];

  for (const [name, fn] of steps) {
    const { error } = (await fn()) as { error: { message: string } | null };
    if (error) {
      return NextResponse.json(
        { error: `Reset failed while clearing ${name}: ${error.message}` },
        { status: 500 }
      );
    }
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

  // 4) Reset purses for teams in this auction
  const { error: tErr } = await admin
    .from("teams")
    .update({ initial_purse: 10_00_00_000 })
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
      note: "Full reset — bids, rosters, auction_players wiped",
    },
  });

  return NextResponse.json({ ok: true, cleared: playerIds.length });
}