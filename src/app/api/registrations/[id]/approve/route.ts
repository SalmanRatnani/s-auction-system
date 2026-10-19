import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_ORDER, type Category } from "@/constants/categories";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await client
    .from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "MAIN_CONTROLLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { grade } = (await request.json().catch(() => ({}))) as { grade?: string };
  if (!grade || !CATEGORY_ORDER.includes(grade as Category)) {
    return NextResponse.json({ error: "Invalid grade" }, { status: 400 });
  }

  // This RPC atomically allocates a globally unique player code, creates the
  // player, approves the registration, and writes the audit record.
  // Repeated requests return the existing approved player instead of
  // inserting a duplicate. Deleting QA records no longer resets code numbers.
  const { data: playerId, error } = await client.rpc("approve_registration_player", {
    p_registration_id: id,
    p_grade: grade,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  return NextResponse.json({ ok: true, playerId });
}
