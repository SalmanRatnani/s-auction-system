import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDraftAuction } from "@/lib/auction";
import { isMissingPartnerColumn } from "@/lib/teams-compat";

export async function GET() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await client
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "MAIN_CONTROLLER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = createAdminClient();
  const auction = await getOrCreateDraftAuction();
  if (!auction)
    return NextResponse.json({ error: "No auction" }, { status: 500 });

  const full = await supabase
    .from("teams")
    .select(
      "id, name, logo_url, captain_user_id, co_captain_user_id, initial_purse, created_at",
    )
    .eq("auction_id", auction.id)
    .order("created_at", { ascending: true });
  const fallback = isMissingPartnerColumn(full.error)
    ? await supabase
        .from("teams")
        .select(
          "id, name, logo_url, captain_user_id, initial_purse, created_at",
        )
        .eq("auction_id", auction.id)
        .order("created_at", { ascending: true })
    : null;
  const error = fallback?.error ?? (fallback ? null : full.error);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  const teams = fallback
    ? (fallback.data ?? []).map((team) => ({
        ...team,
        co_captain_user_id: null,
      }))
    : (full.data ?? []);
  return NextResponse.json({ auction, teams });
}

export async function POST(request: NextRequest) {
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
  if (profile?.role !== "MAIN_CONTROLLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auction = await getOrCreateDraftAuction();
  if (!auction)
    return NextResponse.json({ error: "No auction" }, { status: 500 });

  const { data, error } = await userClient.rpc("manage_draft_team", {
    p_auction_id: auction.id,
  });
  if (error)
    return NextResponse.json(
      {
        error: error.code === "P0001" ? error.message : "Could not create team",
      },
      { status: 409 },
    );
  return NextResponse.json({ team: data });
}
