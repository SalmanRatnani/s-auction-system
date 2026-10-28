import { NextResponse, type NextRequest } from "next/server";
import { authorizeExport, csvResponse } from "@/lib/export-data";
import { allRows } from "@/lib/pagination";
import { csvCell } from "@/lib/security/csv";
export async function GET(request: NextRequest) {
  const auth = await authorizeExport(request);
  if (auth.error) return auth.error;
  const { admin, auctionId } = auth;
  try {
    const bids = await allRows((from, to) =>
      admin
        .from("bids")
        .select(
          "id,amount,is_undone,created_at,team_id,auction_player_id,team:teams(name),auction_player:auction_players(player:players(player_code,name,grade))",
        )
        .eq("auction_id", auctionId)
        .order("created_at")
        .order("id")
        .range(from, to),
    );
    const lines = [
      [
        "Schema Version",
        "Auction ID",
        "Bid ID",
        "Attempt ID",
        "Timestamp",
        "Player Code",
        "Player Name",
        "Grade",
        "Team ID",
        "Team",
        "Amount (₹)",
        "Amount (paise)",
        "Undone",
      ].join(","),
    ];
    for (const b of bids) {
      const ap = Array.isArray(b.auction_player)
        ? b.auction_player[0]
        : b.auction_player;
      const p = ap && (Array.isArray(ap.player) ? ap.player[0] : ap.player);
      const t = Array.isArray(b.team) ? b.team[0] : b.team;
      lines.push(
        [
          2,
          auctionId,
          b.id,
          b.auction_player_id,
          b.created_at,
          p?.player_code ?? "",
          p?.name ?? "",
          p?.grade ?? "",
          b.team_id,
          t?.name ?? "",
          (Number(b.amount) / 100).toFixed(2),
          b.amount,
          b.is_undone ? "yes" : "no",
        ]
          .map(csvCell)
          .join(","),
      );
    }
    return csvResponse(lines.join("\n"), "bids", auctionId);
  } catch {
    return NextResponse.json(
      {
        error: "The complete bid export could not be generated. Please retry.",
      },
      { status: 503 },
    );
  }
}
