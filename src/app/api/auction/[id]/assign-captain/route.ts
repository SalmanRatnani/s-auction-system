import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getBasePrice } from "@/constants/categories";

export const runtime = "nodejs";

function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/**
 * Assign the CURRENT player to their team as a playing captain.
 *
 * Price = average sold_price of the OTHER sold players in the same category
 * (other playing captains are excluded, since their prices are themselves
 * derived). If nobody else in that category has sold yet, the category's
 * base price is used.
 *
 * The price is deducted from the team's purse via purse_ledger.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // --- Auth: staff only ---
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient
    .from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "MAIN_CONTROLLER" && profile?.role !== "AUCTIONEER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: auction } = await admin
    .from("auctions").select("id, status, config").eq("id", id).single();
  if (!auction) return NextResponse.json({ error: "Auction not found" }, { status: 404 });
  if (auction.status !== "LIVE") {
    return NextResponse.json({ error: "Auction is not LIVE" }, { status: 409 });
  }

  // --- Current player ---
  const { data: rawCurrent } = await admin
    .from("auction_players")
    .select("id, round, player_id, player:players (id, name, grade)")
    .eq("auction_id", id)
    .eq("status", "CURRENT")
    .maybeSingle();

  if (!rawCurrent) {
    return NextResponse.json({ error: "No player on the block" }, { status: 409 });
  }

  const player = one<{ id: string; name: string; grade: string | null }>(
    rawCurrent.player as
      | { id: string; name: string; grade: string | null }
      | { id: string; name: string; grade: string | null }[]
      | null
  );
  if (!player?.grade) {
    return NextResponse.json({ error: "Current player has no grade" }, { status: 409 });
  }
  const grade = player.grade;

  // --- Must be a playing captain ---
  const { data: team } = await admin
    .from("teams")
    .select("id, name")
    .eq("auction_id", id)
    .eq("captain_player_id", player.id)
    .limit(1)
    .maybeSingle();

  if (!team) {
    return NextResponse.json(
      { error: `${player.name} is not a team captain — use Sell instead` },
      { status: 409 }
    );
  }

  // --- Category lock: the team can't already own this grade ---
  const { data: roster } = await admin
    .from("team_players")
    .select("player:players (grade)")
    .eq("auction_id", id)
    .eq("team_id", team.id);

  const alreadyOwnsGrade = (roster ?? []).some((r) => {
    const p = one<{ grade: string | null }>(
      r.player as { grade: string | null } | { grade: string | null }[] | null
    );
    return p?.grade === grade;
  });
  if (alreadyOwnsGrade) {
    return NextResponse.json(
      { error: `${team.name} already owns a ${grade} player` },
      { status: 409 }
    );
  }

  // --- Price: average of the other SOLD players in this exact category ---
  const { data: captainRows } = await admin
    .from("teams")
    .select("captain_player_id")
    .eq("auction_id", id)
    .not("captain_player_id", "is", null);
  const captainPlayerIds = new Set(
    (captainRows ?? []).map((t) => t.captain_player_id as string)
  );

  const { data: soldRows, error: soldErr } = await admin
    .from("auction_players")
    .select("player_id, sold_price, players!inner(grade)")
    .eq("auction_id", id)
    .eq("status", "SOLD")
    .eq("players.grade", grade)
    .not("sold_price", "is", null);
  if (soldErr) {
    return NextResponse.json({ error: soldErr.message }, { status: 500 });
  }

  const prices = (soldRows ?? [])
    .filter((r) => r.player_id !== player.id && !captainPlayerIds.has(r.player_id))
    .map((r) => Number(r.sold_price));

  let price: number;
  let basis: "average" | "base_price";
  if (prices.length > 0) {
    price = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    basis = "average";
  } else {
    price = getBasePrice(auction.config as Record<string, unknown>, grade);
    basis = "base_price";
  }

  // --- Purse check ---
  const { data: purse } = await admin
    .from("team_purses")
    .select("remaining_purse")
    .eq("team_id", team.id)
    .maybeSingle();
  const remaining = Number(purse?.remaining_purse ?? 0);
  if (price > remaining) {
    return NextResponse.json(
      { error: `${team.name} has insufficient purse for this assignment` },
      { status: 409 }
    );
  }

  // --- Claim the player (acts as a lock: only one caller flips CURRENT → SOLD) ---
  const { data: claimed } = await admin
    .from("auction_players")
    .update({ status: "SOLD", sold_to_team_id: team.id, sold_price: price })
    .eq("id", rawCurrent.id)
    .eq("status", "CURRENT")
    .select("id")
    .maybeSingle();
  if (!claimed) {
    return NextResponse.json(
      { error: "Player is no longer on the block" },
      { status: 409 }
    );
  }

  const rollback = async () => {
    await admin.from("team_players").delete()
      .eq("auction_id", id).eq("player_id", player.id);
    await admin.from("auction_players")
      .update({ status: "CURRENT", sold_to_team_id: null, sold_price: null })
      .eq("id", rawCurrent.id);
    await admin.from("players").update({ status: "IN_POOL" }).eq("id", player.id);
  };

  const { error: pErr } = await admin
    .from("players").update({ status: "SOLD" }).eq("id", player.id);
  if (pErr) {
    await rollback();
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const { error: tpErr } = await admin.from("team_players").insert({
    auction_id: id,
    team_id: team.id,
    player_id: player.id,
    price,
    acquired_via: "MANUAL_ALLOT",
  });
  if (tpErr) {
    await rollback();
    return NextResponse.json({ error: tpErr.message }, { status: 500 });
  }

  // BID_WON keeps team_purses.spent accurate (the view sums that reason only)
  const { error: lErr } = await admin.from("purse_ledger").insert({
    auction_id: id,
    team_id: team.id,
    delta: -price,
    reason: "BID_WON",
    related_bid_id: null,
    created_by: user.id,
  });
  if (lErr) {
    await rollback();
    return NextResponse.json({ error: lErr.message }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "CAPTAIN_ASSIGNED",
    entity_type: "auction_player",
    entity_id: rawCurrent.id,
    payload: {
      team_id: team.id,
      player_id: player.id,
      grade,
      price,
      basis,
      sample_size: prices.length,
    },
  });

  return NextResponse.json({
    ok: true,
    assigned: {
      team_id: team.id,
      team_name: team.name,
      price,
      basis,
      sample_size: prices.length,
    },
  });
}
