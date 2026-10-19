import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { TeamDetail, type TeamDetailData } from "@/components/auction/TeamDetail";
import { DEFAULT_CONFIG } from "@/constants/auction-config";

export const dynamic = "force-dynamic";

export default async function WatchTeamPage({
  params,
}: {
  params: Promise<{ token: string; teamId: string }>;
}) {
  const { token, teamId } = await params;

  const admin = createAdminClient();

  // Validate viewer token
  const { data: link } = await admin
    .from("viewer_links")
    .select("id, auction_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!link) notFound();
  if (new Date(link.expires_at) < new Date()) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold">Link expired</h1>
          <p className="text-white/60 text-sm">
            Ask the auctioneer for a new link.
          </p>
        </div>
      </div>
    );
  }

  const team = await loadTeamData(admin, link.auction_id, teamId);
  if (!team) notFound();

  return (
    <main className="min-h-screen p-4 md:p-8">
      <TeamDetail
        team={team}
        showPurse={false}
        backHref={`/watch/${token}`}
      />
    </main>
  );
}

export async function loadTeamData(
  admin: ReturnType<typeof createAdminClient>,
  auctionId: string,
  teamId: string
): Promise<TeamDetailData | null> {
  const { data: teamRow } = await admin
    .from("teams")
    .select("id, name, logo_url, captain_user_id, co_captain_user_id, initial_purse")
    .eq("id", teamId)
    .eq("auction_id", auctionId)
    .maybeSingle();

  if (!teamRow) return null;

  // Captain display name
  let captainDisplay: string | null = null;
  const captainIds = [teamRow.captain_user_id, teamRow.co_captain_user_id].filter((id): id is string => !!id);
  if (captainIds.length) {
    const { data: captains } = await admin
      .from("users")
      .select("id, display_name, email")
      .in("id", captainIds);
    captainDisplay = captainIds.map((id) => {
      const user = captains?.find((person) => person.id === id);
      return user?.display_name ?? user?.email ?? "Captain";
    }).join(" / ");
  }

  // Purse + squad
  const { data: purseRow } = await admin
    .from("team_purses")
    .select("remaining_purse, spent, squad_count")
    .eq("team_id", teamId)
    .maybeSingle();

  // Roster
  const { data: rosterRaw } = await admin
    .from("team_players")
    .select(`
      id, price, acquired_via, won_at,
      player:players (
        id, player_code, name, grade, image_url, playing_centre
      )
    `)
    .eq("team_id", teamId)
    .eq("auction_id", auctionId)
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

  // Auction config for max squad
  const { data: auction } = await admin
    .from("auctions")
    .select("config")
    .eq("id", auctionId)
    .maybeSingle();
  const config = (auction?.config ?? {}) as { maxSquad?: number };

  return {
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
}