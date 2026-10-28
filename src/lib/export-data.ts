import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { UUID } from "@/lib/auction-command";
export async function authorizeExport(request: NextRequest) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  const { data: profile } = await client
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!["MAIN_CONTROLLER", "AUCTIONEER"].includes(profile?.role ?? ""))
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  const auctionId = request.nextUrl.searchParams.get("auctionId");
  if (!auctionId || !UUID.test(auctionId))
    return {
      error: NextResponse.json(
        { error: "Choose an auction to export" },
        { status: 400 },
      ),
    };
  const admin = createAdminClient();
  const { data: auction, error } = await admin
    .from("auctions")
    .select("id,name,status")
    .eq("id", auctionId)
    .single();
  if (error || !auction)
    return {
      error: NextResponse.json(
        { error: "Auction unavailable" },
        { status: 404 },
      ),
    };
  return { admin, auctionId, auction, role: profile!.role };
}
export function csvResponse(csv: string, kind: string, auctionId: string) {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="s-auction-${kind}-${auctionId}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Export-Schema": "2",
    },
  });
}
