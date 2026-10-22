import { csvCell } from "@/lib/security/csv";
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
    .select("id")
    .in("status", ["LIVE", "PAUSED", "ENDED", "DRAFT"])
    .order("created_at", { ascending: false })
    .limit(1);
  const auctionId = auctions?.[0]?.id;
  if (!auctionId) return NextResponse.json({ error: "No auction" }, { status: 404 });

  const { data: teams } = await admin
    .from("teams").select("id, name").eq("auction_id", auctionId)
    .order("created_at");

  const { data: rows } = await admin
    .from("team_players")
    .select(`
      team_id, price, acquired_via, won_at,
      player:players (player_code, name, grade, playing_centre)
    `)
    .eq("auction_id", auctionId)
    .order("won_at");

  const teamName = (id: string) => teams?.find((t) => t.id === id)?.name ?? "";

  const lines: string[] = [];
  lines.push(
    ["Team", "Player Code", "Player Name", "Grade", "Playing Centre", "Price (₹)", "Acquired Via", "Won At"].join(",")
  );

  (rows ?? []).forEach((r) => {
    const p = Array.isArray(r.player) ? r.player[0] : r.player;
    if (!p) return;
    lines.push(
      [
        csvCell(teamName(r.team_id)),
        csvCell(p.player_code),
        csvCell(p.name),
        csvCell(p.grade),
        csvCell(p.playing_centre ?? ""),
        (r.price / 100).toFixed(0),
        csvCell(r.acquired_via),
        csvCell(new Date(r.won_at).toISOString()),
      ].join(",")
    );
  });

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="s-auction-teams-${Date.now()}.csv"`,
    },
  });
}
