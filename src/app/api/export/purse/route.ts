import { NextResponse, type NextRequest } from "next/server";
import { authorizeExport, csvResponse } from "@/lib/export-data";
import { csvCell } from "@/lib/security/csv";
export async function GET(request: NextRequest) {
  const auth = await authorizeExport(request);
  if (auth.error) return auth.error;
  const { admin, auctionId, role } = auth;
  if (role !== "MAIN_CONTROLLER")
    return NextResponse.json({ error: "Controller required" }, { status: 403 });
  const { data, error } = await admin
    .from("team_purses")
    .select("team_id,name,initial_purse,remaining_purse,spent,squad_count")
    .eq("auction_id", auctionId)
    .order("team_id");
  if (error)
    return NextResponse.json(
      { error: "Purse export unavailable" },
      { status: 503 },
    );
  const lines = [
    [
      "Schema Version",
      "Auction ID",
      "Team ID",
      "Team",
      "Initial Purse (₹)",
      "Spent (₹)",
      "Remaining (₹)",
      "Initial (paise)",
      "Spent (paise)",
      "Remaining (paise)",
      "Players",
    ].join(","),
  ];
  for (const t of data ?? [])
    lines.push(
      [
        2,
        auctionId,
        t.team_id,
        t.name,
        (Number(t.initial_purse) / 100).toFixed(2),
        (Number(t.spent) / 100).toFixed(2),
        (Number(t.remaining_purse) / 100).toFixed(2),
        t.initial_purse,
        t.spent,
        t.remaining_purse,
        t.squad_count,
      ]
        .map(csvCell)
        .join(","),
    );
  return csvResponse(lines.join("\n"), "purses", auctionId);
}
