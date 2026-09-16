import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient
    .from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "MAIN_CONTROLLER" && profile?.role !== "AUCTIONEER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: auctions } = await admin
    .from("auctions")
    .select("id").order("created_at", { ascending: false }).limit(1);
  const auctionId = auctions?.[0]?.id;
  if (!auctionId) return NextResponse.json({ error: "No auction" }, { status: 404 });

  const { data: bids } = await admin
    .from("bids")
    .select(`
      id, amount, is_undone, created_at,
      team:teams (name),
      auction_player:auction_players (
        player:players (player_code, name, grade)
      )
    `)
    .eq("auction_id", auctionId)
    .order("created_at", { ascending: true });

  const lines: string[] = [];
  lines.push(
    ["Timestamp", "Player Code", "Player Name", "Grade", "Team", "Amount (₹)", "Undone"].join(",")
  );

  (bids ?? []).forEach((b) => {
    const ap = Array.isArray(b.auction_player) ? b.auction_player[0] : b.auction_player;
    const p = ap && (Array.isArray(ap.player) ? ap.player[0] : ap.player);
    const t = Array.isArray(b.team) ? b.team[0] : b.team;
    lines.push(
      [
        new Date(b.created_at).toISOString(),
        csvCell(p?.player_code ?? ""),
        csvCell(p?.name ?? ""),
        csvCell(p?.grade ?? ""),
        csvCell(t?.name ?? ""),
        (b.amount / 100).toFixed(0),
        b.is_undone ? "yes" : "no",
      ].join(",")
    );
  });

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="s-auction-bids-${Date.now()}.csv"`,
    },
  });
}

function csvCell(v: string) {
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}