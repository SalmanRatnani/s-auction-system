import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_ORDER, type Category } from "@/constants/categories";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "MAIN_CONTROLLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { grade } = (await request.json().catch(() => ({}))) as { grade?: string };
  if (!grade || !CATEGORY_ORDER.includes(grade as Category)) {
    return NextResponse.json({ error: "Invalid grade" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("players")
    .update({ grade })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "GRADE_CHANGED",
    entity_type: "player",
    entity_id: id,
    payload: { grade },
  });

  return NextResponse.json({ ok: true });
}