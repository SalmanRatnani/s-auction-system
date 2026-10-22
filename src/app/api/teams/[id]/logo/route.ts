import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isMissingPartnerColumn } from "@/lib/teams-compat";

import { BodyTooLargeError, readLimitedBody } from "@/lib/security/request";
import { normalizeTeamLogo, MAX_LOGO_BYTES } from "@/lib/security/image";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))
    return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const admin = createAdminClient();
  const result = await admin
    .from("teams")
    .select("captain_user_id, co_captain_user_id")
    .eq("id", id)
    .maybeSingle();
  const fallback = isMissingPartnerColumn(result.error)
    ? await admin
        .from("teams")
        .select("captain_user_id")
        .eq("id", id)
        .maybeSingle()
    : null;
  const teamError = fallback?.error ?? (fallback ? null : result.error);
  if (teamError)
    return NextResponse.json({ error: teamError.message }, { status: 500 });
  const team = fallback
    ? fallback.data
      ? { ...fallback.data, co_captain_user_id: null }
      : null
    : result.data;
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const isController = profile?.role === "MAIN_CONTROLLER";
  const isOwnCaptain =
    profile?.role === "CAPTAIN" &&
    (team.captain_user_id === user.id || team.co_captain_user_id === user.id);
  if (!isController && !isOwnCaptain) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let buf: Buffer;
  try {
    const bytes = await readLimitedBody(request, MAX_LOGO_BYTES + 64 * 1024);
    const form = await new Response(bytes as BodyInit, {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("logo");
    if (!(file instanceof File))
      return NextResponse.json({ error: "Missing logo file" }, { status: 400 });
    if (file.size > MAX_LOGO_BYTES)
      throw new BodyTooLargeError("Logo too large");
    buf = await normalizeTeamLogo(new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    const tooLarge = error instanceof BodyTooLargeError;
    return NextResponse.json(
      {
        error: tooLarge
          ? "Logo must be 2 MB or smaller"
          : "Upload a valid, still JPEG, PNG or WebP image (maximum 16 megapixels)",
      },
      { status: tooLarge ? 413 : 400 },
    );
  }
  const path = `${id}/logo-${crypto.randomUUID()}.webp`;
  const { error: upErr } = await admin.storage
    .from("team-logos")
    .upload(path, buf, { contentType: "image/webp", upsert: false });
  if (upErr)
    return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = admin.storage.from("team-logos").getPublicUrl(path);

  const { data: updated, error: updateError } = await admin
    .from("teams")
    .update({ logo_url: pub.publicUrl })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) {
    await admin.storage.from("team-logos").remove([path]);
    return NextResponse.json(
      { error: "Could not save the team logo. Please try again." },
      { status: 500 },
    );
  }
  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "TEAM_LOGO_UPLOADED",
    entity_type: "team",
    entity_id: id,
    payload: { path },
  });

  return NextResponse.json({ logo_url: pub.publicUrl });
}
