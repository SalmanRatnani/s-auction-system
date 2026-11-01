import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTrustedMutation } from "@/lib/security/request";

/**
 * Delete only unlinked registrations. Approved registrations must be revoked,
 * and player/auction history must never be destroyed by this endpoint.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isTrustedMutation(request))
    return NextResponse.json({ error: "Untrusted request" }, { status: 403 });

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
    return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });

  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error: profileError } = await client
    .from("users").select("role").eq("id", user.id).single();
  if (profileError || profile?.role !== "MAIN_CONTROLLER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data: reg, error: fetchError } = await admin.from("registrations")
    .select("id, name, status").eq("id", id).maybeSingle();
  if (fetchError)
    return NextResponse.json({ error: "Registration lookup failed" }, { status: 500 });
  if (!reg)
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  if (reg.status === "APPROVED")
    return NextResponse.json({ error: "Revoke approval before deleting this registration." }, { status: 409 });

  const { count, error: playerError } = await admin.from("players")
    .select("id", { count: "exact", head: true }).eq("registration_id", id);
  if (playerError)
    return NextResponse.json({ error: "Player linkage check failed" }, { status: 500 });
  if ((count ?? 0) > 0)
    return NextResponse.json({ error: "Registration is linked to a player. Remove that link safely before deleting." }, { status: 409 });

  // Status condition prevents deletion if an approval happened after our read.
  const { data: deleted, error } = await admin.from("registrations")
    .delete().eq("id", id).neq("status", "APPROVED").select("id");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 409 });
  if (!deleted?.length)
    return NextResponse.json({ error: "Registration changed. Refresh and try again." }, { status: 409 });

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "REGISTRATION_DELETED",
    entity_type: "registration",
    entity_id: id,
    payload: { name: reg.name, previous_status: reg.status },
  });
  if (auditError) console.error("registration_delete_audit_failed", { code: auditError.code });

  return NextResponse.json({ ok: true });
}
