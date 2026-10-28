import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID: readonly string[] = [
  "MAIN_CONTROLLER",
  "AUCTIONEER",
  "CAPTAIN",
  "VIEWER",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      { status: 400 },
    );
  }

  const { error } = await userClient.rpc("set_user_role", {
    p_user_id: id,
    p_role: role,
  });
  if (error)
    return NextResponse.json(
      { error: error.code === "P0001" ? error.message : "Role update failed" },
      { status: error.code === "42501" ? 403 : 409 },
    );
  return NextResponse.json({ ok: true });
}
