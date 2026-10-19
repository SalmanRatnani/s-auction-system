import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const LOGO_BUCKET = "team-logos";

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

/**
 * Remove every logo belonging to a team from Storage.
 * Logos live at `<teamId>/logo-<timestamp>.<ext>`, so we clear the whole
 * folder, plus whatever path the stored public URL points at.
 */
async function removeTeamLogos(
  admin: ReturnType<typeof createAdminClient>,
  teamId: string,
  logoUrl: string | null
) {
  const paths = new Set<string>();

  const { data: files } = await admin.storage
    .from(LOGO_BUCKET)
    .list(teamId, { limit: 100 });
  (files ?? []).forEach((f) => paths.add(`${teamId}/${f.name}`));

  if (logoUrl) {
    const marker = `/${LOGO_BUCKET}/`;
    const i = logoUrl.indexOf(marker);
    if (i >= 0) {
      const rel = logoUrl.slice(i + marker.length).split("?")[0];
      if (rel) paths.add(decodeURIComponent(rel));
    }
  }

  if (paths.size === 0) return;

  const { error } = await admin.storage.from(LOGO_BUCKET).remove([...paths]);
  if (error) console.error("Team logo cleanup failed", error);
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
  const isOwnCaptain =
    ((team as { captain_user_id: string | null }).captain_user_id === user.id || (team as { co_captain_user_id: string | null }).co_captain_user_id === user.id);

  if (!isController && !isOwnCaptain) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    captain_user_id?: string | null;
    co_captain_user_id?: string | null;
    captain_player_id?: string | null;
    co_captain_player_id?: string | null;
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

  // Only controller can assign/reassign the captain's login
  if ("captain_user_id" in body) {
    if (!isController) {
      return NextResponse.json(
        { error: "Only the controller can assign captains" },
        { status: 403 }
      );
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

  if ("co_captain_user_id" in body) {
    if (!isController) return NextResponse.json({ error: "Only the controller can assign captain partners" }, { status: 403 });
    const partnerId = body.co_captain_user_id ?? null;
    if (partnerId) {
      const { data: partner } = await createAdminClient().from("users").select("id, role").eq("id", partnerId).maybeSingle();
      if (!partner) return NextResponse.json({ error: "Partner login not found" }, { status: 404 });
      if (partnerId === (body.captain_user_id ?? (team as { captain_user_id: string | null }).captain_user_id)) return NextResponse.json({ error: "Captain and partner cannot be the same login" }, { status: 409 });
    }
    update.co_captain_user_id = partnerId;
  }

  // Only controller can assign/reassign the playing captain (a player)
  if ("captain_player_id" in body) {
    if (!isController) {
      return NextResponse.json(
        { error: "Only the controller can assign playing captains" },
        { status: 403 }
      );
    }

    const playerId = body.captain_player_id ?? null;

    if (playerId) {
      const admin = createAdminClient();

      const { data: player } = await admin
        .from("players").select("id, name, status").eq("id", playerId).maybeSingle();
      if (!player) {
        return NextResponse.json({ error: "Player not found" }, { status: 404 });
      }

      // A player can captain only one team
      const { data: other } = await admin
        .from("teams")
        .select("id, name")
        .eq("captain_player_id", playerId)
        .neq("id", id)
        .limit(1)
        .maybeSingle();
      if (other) {
        return NextResponse.json(
          { error: `${player.name} is already the playing captain of ${other.name}` },
          { status: 409 }
        );
      }

      // Already-sold players can't be (re)assigned unless they're already
      // this team's captain (i.e. a no-op re-save).
      const currentCaptainPlayer = (team as { captain_player_id: string | null })
        .captain_player_id;
      if (player.status === "SOLD" && currentCaptainPlayer !== playerId) {
        return NextResponse.json(
          { error: `${player.name} has already been sold` },
          { status: 409 }
        );
      }
    }

    update.captain_player_id = playerId;
  }

  if ("co_captain_player_id" in body) {
    if (!isController) return NextResponse.json({ error: "Only the controller can assign playing captains" }, { status: 403 });
    const playerId = body.co_captain_player_id ?? null;
    if (playerId) {
      const admin = createAdminClient();
      const { data: player } = await admin.from("players").select("id, status").eq("id", playerId).maybeSingle();
      if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
      if (player.status === "SOLD" && playerId !== (team as { co_captain_player_id: string | null }).co_captain_player_id) {
        return NextResponse.json({ error: "Already sold players cannot be newly reserved" }, { status: 409 });
      }
      if (playerId === (body.captain_player_id ?? (team as { captain_player_id: string | null }).captain_player_id)) {
        return NextResponse.json({ error: "Choose two different playing captains" }, { status: 409 });
      }
    }
    update.co_captain_player_id = playerId;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("teams").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (update.co_captain_user_id) {
    const { error: promotionError } = await admin.from("users").update({ role: "CAPTAIN" }).eq("id", update.co_captain_user_id).eq("role", "VIEWER");
    if (promotionError) console.error("Partner promotion failed", promotionError);
  }
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

  const admin = createAdminClient();

  // Guard: a team that owns players can't be deleted
  const { count } = await admin
    .from("team_players").select("id", { count: "exact", head: true })
    .eq("team_id", id);
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Cannot delete a team with players" },
      { status: 409 }
    );
  }

  // Remove the logo(s) from Storage BEFORE deleting the row
  await removeTeamLogos(
    admin,
    id,
    (team as { logo_url: string | null }).logo_url
  );

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
