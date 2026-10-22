import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  if (profile?.role !== "MAIN_CONTROLLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    amount?: number;
    reason?: string;
  };

  if (!Number.isSafeInteger(body.amount) || (body.amount ?? 0) <= 0 || (body.amount ?? 0) > 100_000_000_000) {
    return NextResponse.json({ error: "amount must be a positive safe integer in paise (max 100000000000)" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: team } = await admin
    .from("teams").select("id, auction_id, name").eq("id", id).single();
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const { error } = await admin.from("purse_ledger").insert({
    auction_id: team.auction_id,
    team_id: team.id,
    delta: body.amount,
    reason: "TOPUP",
    created_by: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "PURSE_TOPUP",
    entity_type: "team",
    entity_id: team.id,
    payload: { amount: body.amount, reason: body.reason ?? null },
  });

  return NextResponse.json({ ok: true });
}