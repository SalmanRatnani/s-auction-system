import { NextResponse, type NextRequest } from "next/server";
import { authorizeExport, csvResponse } from "@/lib/export-data";
import { allRows } from "@/lib/pagination";
import { csvCell } from "@/lib/security/csv";
export async function GET(request: NextRequest) {
  const auth = await authorizeExport(request);
  if (auth.error) return auth.error;
  const { admin, auctionId } = auth;
  try {
    const { data: teams, error } = await admin
      .from("teams")
      .select("id,name,captain_player_id,co_captain_player_id,logo_url")
      .eq("auction_id", auctionId);
    if (error) throw error;
    const rows = await allRows((from, to) =>
      admin
        .from("team_players")
        .select(
          "id,team_id,player_id,price,acquired_via,won_at,player:players(id,player_code,name,grade,playing_centre,playing_hand,image_url,achievements)",
        )
        .eq("auction_id", auctionId)
        .order("won_at")
        .order("id")
        .range(from, to),
    );
    const generated = new Date().toISOString();
    const lines = [
      [
        "Schema Version",
        "Auction ID",
        "Team ID",
        "Team",
        "Player ID",
        "Player Code",
        "Player Name",
        "Grade",
        "Playing Centre",
        "Playing Hand",
        "Price (₹)",
        "Price (paise)",
        "Acquired Via",
        "Captain Slot",
        "Image Export Filename",
        "Image URL",
        "Achievements",
        "Team Logo URL",
        "Won At",
        "Generated At",
      ].join(","),
    ];
    for (const r of rows) {
      const p = Array.isArray(r.player) ? r.player[0] : r.player;
      if (!p) throw new Error("Missing player");
      const t = teams?.find((t) => t.id === r.team_id);
      if (!t) throw new Error("Missing team");
      let filename = "";
      try {
        filename = `${p.id}.${new URL(p.image_url ?? "").pathname.split(".").pop() ?? "webp"}`;
      } catch {}
      lines.push(
        [
          2,
          auctionId,
          t.id,
          t.name,
          p.id,
          p.player_code,
          p.name,
          p.grade,
          p.playing_centre ?? "",
          p.playing_hand ?? "",
          (Number(r.price) / 100).toFixed(2),
          r.price,
          r.acquired_via,
          t.captain_player_id === p.id
            ? 1
            : t.co_captain_player_id === p.id
              ? 2
              : "",
          filename,
          p.image_url ?? "",
          p.achievements ?? "",
          t.logo_url ?? "",
          r.won_at,
          generated,
        ]
          .map(csvCell)
          .join(","),
      );
    }
    return csvResponse(lines.join("\n"), "teams", auctionId);
  } catch {
    return NextResponse.json(
      {
        error:
          "The complete roster export could not be generated. Please retry.",
      },
      { status: 503 },
    );
  }
}
