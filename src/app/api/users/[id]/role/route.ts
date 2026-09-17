import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const VALID: readonly string[] = [
  "MAIN_CONTROLLER",
  "AUCTIONEER",
  "CAPTAIN",
  "VIEWER",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await userClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "MAIN_CONTROLLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { role?: string };
  const { role } = body;

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

  const { data: target } = await admin
    .from("users")
    .select("email, role")
    .eq("id", id)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Guard: don't demote the last Main Controller
  if (target.role === "MAIN_CONTROLLER" && role !== "MAIN_CONTROLLER") {
    const { count } = await admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "MAIN_CONTROLLER");
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Cannot demote the last Main Controller" },
        { status: 409 }
      );
    }
  }

  const { error } = await admin
    .from("users")
    .update({ role })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "ROLE_CHANGED",
    entity_type: "user",
    entity_id: id,
    payload: { from: target.role, to: role, email: target.email },
  });

  return NextResponse.json({ ok: true });
}