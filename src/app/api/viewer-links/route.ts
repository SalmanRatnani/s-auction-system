import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { randomToken } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient
    .from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "MAIN_CONTROLLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    auctionId?: string;
    hoursValid?: number;
  };

  if (!body.auctionId) {
    return NextResponse.json({ error: "auctionId required" }, { status: 400 });
  }

  const hours = Math.max(1, Math.min(72, body.hoursValid ?? 12));
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("viewer_links")
    .insert({
      auction_id: body.auctionId,
      token,
      expires_at: expiresAt,
      created_by: user.id,
    })
    .select("id, token, expires_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "VIEWER_LINK_CREATED",
    entity_type: "viewer_link",
    entity_id: data.id,
    payload: { expires_at: expiresAt },
  });

  return NextResponse.json({ link: data });
}