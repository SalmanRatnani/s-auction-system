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
  const { data: current } = await admin
    .from("auctions").select("status").eq("id", id).single();
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (current.status !== "LIVE") {
    return NextResponse.json({ error: "Only LIVE auctions can be paused" }, { status: 409 });
  }

  await admin.from("auctions").update({ status: "PAUSED" }).eq("id", id);
  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "AUCTION_PAUSED",
    entity_type: "auction",
    entity_id: id,
  });

  return NextResponse.json({ ok: true });
}