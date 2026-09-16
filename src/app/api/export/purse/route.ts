import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient
    .from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "MAIN_CONTROLLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: auctions } = await admin
    .from("auctions")
    .select("id").order("created_at", { ascending: false }).limit(1);
  const auctionId = auctions?.[0]?.id;
  if (!auctionId) return NextResponse.json({ error: "No auction" }, { status: 404 });

  const { data: teams } = await admin
    .from("teams").select("id, name, initial_purse").eq("auction_id", auctionId)
    .order("created_at");

  const { data: purses } = await admin
    .from("team_purses")
    .select("team_id, remaining_purse, spent, squad_count")
    .eq("auction_id", auctionId);

  const map: Record<string, { remaining_purse: number; spent: number; squad_count: number }> = {};
  (purses ?? []).forEach((p) => {
    map[p.team_id] = {
      remaining_purse: Number(p.remaining_purse ?? 0),
      spent: Number(p.spent ?? 0),
      squad_count: Number(p.squad_count ?? 0),
    };
  });

  const lines: string[] = [];
  lines.push(["Team", "Initial Purse (₹)", "Spent (₹)", "Remaining (₹)", "Players"].join(","));
  (teams ?? []).forEach((t) => {
    const p = map[t.id];
    lines.push(
      [
        csvCell(t.name),
        (t.initial_purse / 100).toFixed(0),
        ((p?.spent ?? 0) / 100).toFixed(0),
        ((p?.remaining_purse ?? t.initial_purse) / 100).toFixed(0),
        String(p?.squad_count ?? 0),
      ].join(",")
    );
  });

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="s-auction-purses-${Date.now()}.csv"`,
    },
  });
}

function csvCell(v: string) {
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}