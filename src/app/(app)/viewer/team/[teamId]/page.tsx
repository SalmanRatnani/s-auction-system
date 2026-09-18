import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { getOrCreateDraftAuction } from "@/lib/auction";
import { TeamDetail, type TeamDetailData } from "@/components/auction/TeamDetail";
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role ?? "VIEWER";

  const auction = await getOrCreateDraftAuction();
  if (!auction) return <div className="text-red-300">No auction.</div>;

  const { data: teamRow } = await supabase
    .from("teams")
    .select("id, name, logo_url, captain_user_id, initial_purse")
    .eq("id", teamId)
    .eq("auction_id", auction.id)
    .maybeSingle();

  if (!teamRow) notFound();

  let captainDisplay: string | null = null;
  if (teamRow.captain_user_id) {
    const { data: captain } = await supabase
      .from("users")
      .select("display_name, email")
      .eq("id", teamRow.captain_user_id)
      .maybeSingle();
    captainDisplay = captain?.display_name ?? captain?.email ?? null;
  }

  const { data: purseRow } = await supabase
    .from("team_purses")
    .select("remaining_purse, spent, squad_count")
    .eq("team_id", teamId)
    .maybeSingle();

  const { data: rosterRaw } = await supabase
    .from("team_players")
    .select(`
      id, price, acquired_via, won_at,
      player:players (
        id, player_code, name, grade, image_url, playing_centre
      )
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

  const config = (auction.config ?? {}) as {
    maxSquad?: number;
    showPurseToViewers?: boolean;
  };

  // Purse visibility
  const showPurse =
    role === "MAIN_CONTROLLER" ||
    role === "AUCTIONEER" ||
    (role === "CAPTAIN" && config.showPurseToViewers !== false) ||
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
        showPurse={false}
        backHref="/viewer/live"
        playerLinkBase="/player"
      />
    </div>
  );
}