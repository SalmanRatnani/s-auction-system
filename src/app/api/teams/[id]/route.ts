import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function loadUserAndTeam(
  teamId: string
): Promise<
  | { error: NextResponse }
  | { user: { id: string; role: string }; team: Record<string, unknown> }
> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await userClient
    .from("users").select("role").eq("id", user.id).single();

  const admin = createAdminClient();
  const { data: team } = await admin
    .from("teams").select("*").eq("id", teamId).single();
  if (!team) return { error: NextResponse.json({ error: "Team not found" }, { status: 404 }) };

  return { user: { id: user.id, role: profile?.role ?? "VIEWER" }, team };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const loaded = await loadUserAndTeam(id);
  if ("error" in loaded) return loaded.error;
  const { user, team } = loaded;

  const isController = user.role === "MAIN_CONTROLLER";
  const isOwnCaptain = (team as { captain_user_id: string | null }).captain_user_id === user.id;

  if (!isController && !isOwnCaptain) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    captain_user_id?: string | null;
  };

  const update: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (trimmed.length < 2 || trimmed.length > 40) {
      return NextResponse.json(
        { error: "Team name must be 2–40 characters" },
        { status: 400 }
      );
    }
    update.name = trimmed;
  }

  // Only controller can assign/reassign captain
  if ("captain_user_id" in body) {
    if (!isController) {
      return NextResponse.json({ error: "Only the controller can assign captains" }, { status: 403 });
    }
    update.captain_user_id = body.captain_user_id ?? null;

    // Auto-promote the assigned user to CAPTAIN if not already
    if (body.captain_user_id) {
      const admin = createAdminClient();
      const { data: target } = await admin
        .from("users").select("role").eq("id", body.captain_user_id).single();
      if (target && target.role !== "CAPTAIN" && target.role !== "MAIN_CONTROLLER") {
        await admin
          .from("users").update({ role: "CAPTAIN" })
          .eq("id", body.captain_user_id);
      }
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("teams").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "TEAM_UPDATED",
    entity_type: "team",
    entity_id: id,
    payload: update,
  });

  return NextResponse.json({ team: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const loaded = await loadUserAndTeam(id);
  if ("error" in loaded) return loaded.error;
  const { user, team } = loaded;

  if (user.role !== "MAIN_CONTROLLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Guard: no team_players
  const admin = createAdminClient();
  const { count } = await admin
    .from("team_players").select("id", { count: "exact", head: true })
    .eq("team_id", id);
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Cannot delete a team with players" },
      { status: 409 }
    );
  }

  const { error } = await admin.from("teams").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "TEAM_DELETED",
    entity_type: "team",
    entity_id: id,
    payload: { name: (team as { name: string }).name },
  });

  return NextResponse.json({ ok: true });
}