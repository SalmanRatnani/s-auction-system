import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth check via user client (RLS-aware)
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
  if (!grade) {
    return NextResponse.json({ error: "Grade is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: reg, error: rerr } = await admin
    .from("registrations")
    .select("*")
    .eq("id", id)
    .single();
  if (rerr || !reg) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  if (reg.status === "APPROVED") {
    return NextResponse.json({ error: "Already approved" }, { status: 409 });
  }

  // Player code: SAS-<year>-<4-digit sequence>
  const { count } = await admin
    .from("players")
    .select("id", { count: "exact", head: true });
  const seq = String((count ?? 0) + 1).padStart(4, "0");
  const playerCode = `SAS-${new Date().getFullYear()}-${seq}`;

  const { data: player, error: perr } = await admin
    .from("players")
    .insert({
      player_code: playerCode,
      registration_id: reg.id,
      name: reg.name,
      dob: reg.dob,
      image_url: reg.image_url,
      achievements: reg.achievements,
      playing_centre: reg.playing_centre,
      participation_history: reg.participation_history,
      played_mira_bhayandar: reg.played_mira_bhayandar,
      age_proof_url: reg.age_proof_url,
      age_proof_type: reg.age_proof_type,
      grade,
      status: "IN_POOL",
    })
    .select("id")
    .single();

  if (perr) {
    return NextResponse.json({ error: perr.message }, { status: 500 });
  }

  await admin
    .from("registrations")
    .update({
      status: "APPROVED",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "REGISTRATION_APPROVED",
    entity_type: "registration",
    entity_id: id,
    payload: { grade, player_id: player.id },
  });

  return NextResponse.json({ ok: true, playerId: player.id });
}