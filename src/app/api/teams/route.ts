import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDraftAuction } from "@/lib/auction";
import { PURSE_PAISE } from "@/constants/categories";
import { isMissingPartnerColumn } from "@/lib/teams-compat";

const MAX_TEAMS = 6;

export async function GET() {
  const supabase = await createClient();
  const auction = await getOrCreateDraftAuction();
  if (!auction) return NextResponse.json({ error: "No auction" }, { status: 500 });

  const full = await supabase.from("teams")
    .select("id, name, logo_url, captain_user_id, co_captain_user_id, initial_purse, created_at")
    .eq("auction_id", auction.id).order("created_at", { ascending: true });
  const fallback = isMissingPartnerColumn(full.error)
    ? await supabase.from("teams")
        .select("id, name, logo_url, captain_user_id, initial_purse, created_at")
        .eq("auction_id", auction.id).order("created_at", { ascending: true })
    : null;
  const error = fallback?.error ?? (fallback ? null : full.error);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const teams = fallback
    ? (fallback.data ?? []).map((team) => ({ ...team, co_captain_user_id: null }))
    : full.data ?? [];
  return NextResponse.json({ auction, teams });
}

export async function POST(request: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient
    .from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "MAIN_CONTROLLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auction = await getOrCreateDraftAuction();
  if (!auction) return NextResponse.json({ error: "No auction" }, { status: 500 });

  const admin = createAdminClient();

  // Cap at 6 teams
  const { count } = await admin
    .from("teams").select("id", { count: "exact", head: true })
    .eq("auction_id", auction.id);
  if ((count ?? 0) >= MAX_TEAMS) {
    return NextResponse.json(
      { error: `Max ${MAX_TEAMS} teams reached` },
      { status: 409 }
    );
  }

  // Placeholder name — captain will change it
  const slot = (count ?? 0) + 1;
  const { data, error } = await admin
    .from("teams")
    .insert({
      auction_id: auction.id,
      name: `Team ${slot}`,
      initial_purse: PURSE_PAISE,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "TEAM_CREATED",
    entity_type: "team",
    entity_id: data.id,
    payload: { auction_id: auction.id },
  });

  return NextResponse.json({ team: data });
}