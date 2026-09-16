import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const VALID = ["MAIN_CONTROLLER", "AUCTIONEER", "CAPTAIN", "VIEWER"];

export async function PATCH(
  request: NextRequest,
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

  const { role } = (await request.json().catch(() => ({}))) as { role?: string };
  if (!role || !VALID.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Prevent demoting yourself
  if (id === user.id && role !== "MAIN_CONTROLLER") {
    return NextResponse.json(
      { error: "You cannot change your own role" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ role }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "ROLE_CHANGED",
    entity_type: "user",
    entity_id: id,
    payload: { role },
  });

  return NextResponse.json({ ok: true });
}