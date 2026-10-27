import { createAuthorizedReader } from "@/lib/security/page-access";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { getOrCreateDraftAuction } from "@/lib/auction";
import {
  TeamDetail,
  type TeamDetailData,
} from "@/components/auction/TeamDetail";
import { DEFAULT_CONFIG } from "@/constants/auction-config";

export const dynamic = "force-dynamic";

export default async function ViewerTeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  return (
    <RoleGuard allow={["VIEWER", "CAPTAIN", "MAIN_CONTROLLER", "AUCTIONEER"]}>
      <Inner params={params} />
    </RoleGuard>
  );
}

async function Inner({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const supabase = await createClient();
  const reader = await createAuthorizedReader([
    "VIEWER",
    "CAPTAIN",
    "MAIN_CONTROLLER",
    "AUCTIONEER",
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await reader
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role ?? "VIEWER";

  const auction = await getOrCreateDraftAuction();
  if (!auction) return <div className="text-red-300">No auction.</div>;

  const { data: teamRow } = await reader
    .from("teams")
    .select(
      "id, name, logo_url, captain_user_id, co_captain_user_id, initial_purse",
    )
    .eq("id", teamId)
    .eq("auction_id", auction.id)
    .maybeSingle();

  if (!teamRow) notFound();

  let captainDisplay: string | null = null;
  const captainIds = [
    teamRow.captain_user_id,
    teamRow.co_captain_user_id,
  ].filter((id): id is string => !!id);
  if (captainIds.length) {
    const { data: captains } = await reader
      .from("users")
      .select("id, display_name")
      .in("id", captainIds);
    captainDisplay = captainIds
      .map((id) => {
        const user = captains?.find((person) => person.id === id);
        return user?.display_name ?? "Captain";
      })
      .join(" / ");
  }

  const { data: purseRow, error: purseError } = await reader
    .from("team_purses")
    .select("remaining_purse, spent, squad_count")
    .eq("team_id", teamId)
    .maybeSingle();
  if (purseError || !purseRow)
    throw new Error("Purse information is unavailable. Please refresh.");

  const { data: rosterRaw, error: rosterError } = await reader
    .from("team_players")
    .select(
      `
      id, price, acquired_via, won_at,
      player:players (
        id, player_code, name, grade, image_url, playing_centre
      )
    `,
    )
    .eq("team_id", teamId)
    .eq("auction_id", auction.id)
    .order("won_at", { ascending: true });
  if (rosterError)
    throw new Error("Team roster could not be loaded. Please refresh.");

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

  const config = (auction.config ?? {}) as {
    maxSquad?: number;
    showPurseToViewers?: boolean;
    showPurseToCaptains?: boolean;
  };

  // Purse visibility
  const showPurse =
    role === "MAIN_CONTROLLER" ||
    role === "AUCTIONEER" ||
    (role === "CAPTAIN" &&
      ([teamRow.captain_user_id, teamRow.co_captain_user_id].includes(
        user.id,
      ) ||
        config.showPurseToCaptains !== false)) ||
    (role === "VIEWER" && config.showPurseToViewers === true);

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
    <div className="animate-slide-up">
      <TeamDetail
        team={team}
        showPurse={showPurse}
        backHref="/viewer/live"
        playerLinkBase="/player"
      />
    </div>
  );
}
