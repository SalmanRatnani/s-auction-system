import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const CAN_RENAME = ["MAIN_CONTROLLER", "AUCTIONEER", "CAPTAIN"];

export async function PATCH(request: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient
    .from("users").select("role").eq("id", user.id).single();
  if (!profile || !CAN_RENAME.includes(profile.role)) {
    return NextResponse.json(
      { error: "Your role cannot change its display name" },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { display_name?: string };
  const name = (body.display_name ?? "").trim();

  if (name.length < 2 || name.length > 40) {
    return NextResponse.json(
      { error: "Name must be 2–40 characters" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ display_name: name })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "DISPLAY_NAME_CHANGED",
    entity_type: "user",
    entity_id: user.id,
    payload: { display_name: name },
  });

  return NextResponse.json({ ok: true, display_name: name });
}