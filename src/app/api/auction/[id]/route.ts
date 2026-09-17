import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireController() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await userClient
    .from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "MAIN_CONTROLLER") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireController();
  if (auth.error) return auth.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("auctions")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ auction: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireController();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    mode?: "DRY_RUN" | "LIVE";
    config?: Record<string, unknown>;
  };

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("auctions")
    .select("status, config")
    .eq("id", id)
    .single();
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (current.status === "LIVE" || current.status === "PAUSED") {
    if (body.config) {
      return NextResponse.json(
        { error: "Cannot change config while auction is live" },
        { status: 409 }
      );
    }
  }

  const update: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    update.name = body.name.trim();
  }
  if (body.mode) {
    update.mode = body.mode;
  }
  if (body.config) {
    update.config = { ...(current.config ?? {}), ...body.config };
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("auctions")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_user_id: auth.user!.id,
    action: "AUCTION_CONFIG_UPDATED",
    entity_type: "auction",
    entity_id: id,
    payload: update,
  });

  return NextResponse.json({ auction: data });
}