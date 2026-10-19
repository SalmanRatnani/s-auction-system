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
  const { data: auction, error: auctionError } = await admin
    .from("auctions").select("captains_finalized_at").eq("id", id).maybeSingle();
  if (auctionError) return NextResponse.json({ error: auctionError.message }, { status: 500 });
  if (!auction) return NextResponse.json({ error: "Auction not found" }, { status: 404 });
  if (!auction.captains_finalized_at) {
    return NextResponse.json({ error: "Finalize playing captains before ending the auction." }, { status: 409 });
  }
  const { error } = await admin
    .from("auctions")
    .update({ status: "ENDED", ended_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "AUCTION_ENDED",
    entity_type: "auction",
    entity_id: id,
  });

  return NextResponse.json({ ok: true });
}