import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { getOrCreateDraftAuction } from "@/lib/auction";
import {
  TeamDetail,
  type TeamDetailData,
} from "@/components/auction/TeamDetail";
import { DEFAULT_CONFIG } from "@/constants/auction-config";
import { isMissingPartnerColumn } from "@/lib/teams-compat";

export const dynamic = "force-dynamic";

export default async function CaptainTeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  return (
    <RoleGuard allow={["CAPTAIN", "MAIN_CONTROLLER", "AUCTIONEER", "VIEWER"]}>
      <Inner params={params} />
    </RoleGuard>
  );
}

async function Inner({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const auction = await getOrCreateDraftAuction();
  if (!auction) return <div className="text-[var(--danger)]">No auction.</div>;

  // Load team
  const teamQuery = await supabase.from("teams")
    .select("id, name, logo_url, captain_user_id, co_captain_user_id, initial_purse")
    .eq("id", teamId).eq("auction_id", auction.id).maybeSingle();
  const fallback = isMissingPartnerColumn(teamQuery.error)
    ? await supabase.from("teams").select("id, name, logo_url, captain_user_id, initial_purse")
        .eq("id", teamId).eq("auction_id", auction.id).maybeSingle()
    : null;
  const teamError = fallback?.error ?? (fallback ? null : teamQuery.error);
  if (teamError) throw new Error(`Could not load team: ${teamError.message}`);
  const teamRow = fallback ? (fallback.data ? { ...fallback.data, co_captain_user_id: null } : null) : teamQuery.data;
  if (!teamRow) notFound();

  // Captain display name
  let captainDisplay: string | null = null;
  if (teamRow.captain_user_id) {
    const { data: captain } = await supabase
      .from("users")
      .select("display_name, email")
      .eq("id", teamRow.captain_user_id)
      .maybeSingle();
    captainDisplay = captain?.display_name ?? captain?.email ?? null;
  }

  // Purse + squad count
  const { data: purseRow } = await supabase
    .from("team_purses")
    .select("remaining_purse, spent, squad_count")
    .eq("team_id", teamId)
    .maybeSingle();

  // Roster
  const { data: rosterRaw } = await supabase
    .from("team_players")
    .select(`
      id, price, acquired_via, won_at,
      player:players (id, player_code, name, grade, image_url)
    `)
    .eq("team_id", teamId)
    .eq("auction_id", auction.id)
    .order("won_at", { ascending: true });

  const roster = (rosterRaw ?? [])
    .map((r) => {
      const p = Array.isArray(r.player) ? r.player[0] : r.player;
      if (!p) return null;
      return {
        id: r.id,
        price: r.price,
        acquired_via: r.acquired_via,
        won_at: r.won_at,
        player: p,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const config = (auction.config ?? {}) as { maxSquad?: number };

  // Purse shows ONLY when viewing your own team
  const isMyTeam = (teamRow.captain_user_id === user.id || teamRow.co_captain_user_id === user.id);

  const team: TeamDetailData = {
    id: teamRow.id,
    name: teamRow.name,
    logo_url: teamRow.logo_url,
    captain_display: captainDisplay,
    initial_purse: teamRow.initial_purse,
    remaining_purse: Number(purseRow?.remaining_purse ?? teamRow.initial_purse),
    spent: Number(purseRow?.spent ?? 0),
    squad_count: Number(purseRow?.squad_count ?? roster.length),
    maxSquad: config.maxSquad ?? DEFAULT_CONFIG.maxSquad,
    roster,
  };

  return (
    <TeamDetail
      team={team}
      showPurse={isMyTeam}
      backHref="/captain/teams"
      playerLinkBase="/player"
    />
  );
}