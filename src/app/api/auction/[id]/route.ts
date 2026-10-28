import { validateAuctionConfig } from "@/lib/security/auction-config";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireController() {
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
  if (profile?.role !== "MAIN_CONTROLLER") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { user };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
  if (error || !data)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ auction: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireController();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    mode?: "DRY_RUN" | "LIVE";
    config?: Record<string, unknown>;
  };

  if (body.mode !== undefined && !["LIVE", "DRY_RUN"].includes(body.mode))
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  if (
    body.name !== undefined &&
    (typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.trim().length > 120)
  )
    return NextResponse.json(
      { error: "Name must be 1–120 characters" },
      { status: 400 },
    );
  if (body.config !== undefined) {
    const error = validateAuctionConfig(body.config);
    if (error) return NextResponse.json({ error }, { status: 400 });
  }
  const { data, error } = await createAdminClient().rpc("configure_auction", {
    p_auction_id: id,
    p_actor: auth.user!.id,
    p_changes: body,
  });
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === "P0001"
            ? error.message
            : "Configuration update failed",
      },
      { status: 409 },
    );
  return NextResponse.json({ auction: data });
}
