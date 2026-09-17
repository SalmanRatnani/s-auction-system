import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
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

  // Block self-delete
  if (id === user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Load target user info for the audit log
  const { data: target } = await admin
    .from("users")
    .select("email, role")
    .eq("id", id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Block deleting another MAIN_CONTROLLER if it would leave 0 or 1
  if (target.role === "MAIN_CONTROLLER") {
    const { count } = await admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "MAIN_CONTROLLER");
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last Main Controller" },
        { status: 409 }
      );
    }
  }

  // Delete from auth.users → cascades to public.users
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit (this inserts even after the user is gone — safe because we're using admin client)
  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "USER_DELETED",
    entity_type: "user",
    entity_id: id,
    payload: { email: target.email, role: target.role },
  });

  return NextResponse.json({ ok: true });
}