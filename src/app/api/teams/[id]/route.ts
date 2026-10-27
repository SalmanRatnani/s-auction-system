import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const LOGO_BUCKET = "team-logos";

async function loadUserAndTeam(
  teamId: string,
): Promise<
  | { error: NextResponse }
  | { user: { id: string; role: string }; team: Record<string, unknown> }
> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user)
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };

  const { data: profile } = await userClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const admin = createAdminClient();
  const { data: team } = await admin
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();
  if (!team)
    return {
      error: NextResponse.json({ error: "Team not found" }, { status: 404 }),
    };

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
  logoUrl: string | null,
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
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || Array.isArray(body) || typeof body !== "object")
    return NextResponse.json(
      { error: "Invalid team details" },
      { status: 400 },
    );
  const { data, error } = await client.rpc("update_team_config", {
    p_team_id: id,
    p_changes: body,
  });
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === "P0001" || error.code === "42501"
            ? error.message
            : "Team update failed",
      },
      { status: error.code === "42501" ? 403 : 409 },
    );
  return NextResponse.json({ team: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const loaded = await loadUserAndTeam(id);
  if ("error" in loaded) return loaded.error;
  const { user, team } = loaded;

  if (user.role !== "MAIN_CONTROLLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const client = await createClient();
  const { error } = await client.rpc("manage_draft_team", {
    p_auction_id: team.auction_id,
    p_team_id: id,
  });
  if (error)
    return NextResponse.json(
      {
        error: error.code === "P0001" ? error.message : "Could not remove team",
      },
      { status: 409 },
    );
  // Storage cleanup follows the committed deletion, never a failed transaction.
  await removeTeamLogos(admin, id, team.logo_url as string | null);
  return NextResponse.json({ ok: true });
}
