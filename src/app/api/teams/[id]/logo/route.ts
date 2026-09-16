import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function extFromMime(mime: string): string | null {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[mime] ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient
    .from("users").select("role").eq("id", user.id).single();

  const admin = createAdminClient();
  const { data: team } = await admin
    .from("teams").select("captain_user_id").eq("id", id).single();
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const isController = profile?.role === "MAIN_CONTROLLER";
  const isOwnCaptain = team.captain_user_id === user.id;
  if (!isController && !isOwnCaptain) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("logo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Logo must be ≤2 MB" }, { status: 400 });
  }
  const ext = extFromMime(file.type);
  if (!ext) {
    return NextResponse.json({ error: "Only JPEG / PNG / WebP" }, { status: 400 });
  }

  const path = `${id}/logo-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from("team-logos")
    .upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = admin.storage.from("team-logos").getPublicUrl(path);

  await admin.from("teams").update({ logo_url: pub.publicUrl }).eq("id", id);
  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "TEAM_LOGO_UPLOADED",
    entity_type: "team",
    entity_id: id,
    payload: { path },
  });

  return NextResponse.json({ logo_url: pub.publicUrl });
}