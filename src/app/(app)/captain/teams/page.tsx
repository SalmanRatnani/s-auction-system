import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOrCreateDraftAuction } from "@/lib/auction";
import { formatINR } from "@/lib/utils";
import { CATEGORY_COLORS, type Category } from "@/constants/categories";

export const dynamic = "force-dynamic";

export default async function AllTeamsPage() {
  return (
    <RoleGuard
      allow={["CAPTAIN", "MAIN_CONTROLLER", "AUCTIONEER", "VIEWER"]}
    >
      <Inner />
    </RoleGuard>
  );
}

async function Inner() {
  const supabase = await createClient();
  const auction = await getOrCreateDraftAuction();
  if (!auction) return <div className="text-red-300">No auction.</div>;

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user!.id)
    .single();
  const role = profile?.role ?? "VIEWER";

  const config = (auction.config ?? {}) as {
    showPurseToCaptains?: boolean;
    showPurseToViewers?: boolean;
    maxSquad?: number;
  };
  const maxSquad = config.maxSquad ?? 18;

  const canSeePurse =
    role === "MAIN_CONTROLLER" ||
    role === "AUCTIONEER" ||
    (role === "CAPTAIN" && config.showPurseToCaptains !== false) ||
    (role === "VIEWER" && config.showPurseToViewers === true);

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, logo_url, captain_user_id, initial_purse, created_at")
    .eq("auction_id", auction.id)
    .order("created_at", { ascending: true });

  const { data: purses } = await supabase
    .from("team_purses")
    .select("team_id, remaining_purse, spent, squad_count")
    .eq("auction_id", auction.id);

  const purseByTeam: Record<string, { remaining_purse: number; spent: number; squad_count: number }> = {};
  (purses ?? []).forEach((p) => {
    purseByTeam[p.team_id] = {
      remaining_purse: Number(p.remaining_purse ?? 0),
      spent: Number(p.spent ?? 0),
      squad_count: Number(p.squad_count ?? 0),
    };
  });

  // Rosters grouped by team
  const { data: rosters } = await supabase
    .from("team_players")
    .select(`
      team_id, price, won_at,
      player:players (id, player_code, name, grade, image_url)
    `)
    .eq("auction_id", auction.id)
    .order("won_at", { ascending: true });

  const byTeam: Record<string, Array<{
    id: string;
    price: number;
    player: { id: string; player_code: string; name: string; grade: string; image_url: string | null };
  }>> = {};

  (rosters ?? []).forEach((r) => {
    const p = Array.isArray(r.player) ? r.player[0] : r.player;
    if (!p) return;
    (byTeam[r.team_id] ??= []).push({ id: r.team_id, price: r.price, player: p });
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <h1 className="text-3xl font-bold">All Teams</h1>
        <p className="text-white/50 text-sm mt-1">
          {teams?.length ?? 0} teams
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(teams ?? []).map((t) => {
          const purse = purseByTeam[t.id];
          const squad = byTeam[t.id] ?? [];
          const remaining = purse?.remaining_purse ?? t.initial_purse;
          const squadCount = purse?.squad_count ?? squad.length;
          return (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {t.logo_url ? (
                    <img
                      src={t.logo_url}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover border border-white/10"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-white/5 border border-white/10 grid place-items-center text-xl">
                      🏸
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{t.name}</CardTitle>
                    <div className="text-xs text-white/50">
                      {squadCount}/{maxSquad} players
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                {canSeePurse && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2">
                      <div className="text-[10px] text-emerald-300/70 uppercase tracking-wider">
                        Remaining
                      </div>
                      <div className="text-sm font-bold text-emerald-300">
                        {formatINR(remaining, { compact: true })}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/5 border border-white/10 p-2">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider">
                        Spent
                      </div>
                      <div className="text-sm font-bold text-white/90">
                        {formatINR(purse?.spent ?? 0, { compact: true })}
                      </div>
                    </div>
                  </div>
                )}

                {squad.length === 0 ? (
                  <p className="text-xs text-white/30 py-2">No players yet.</p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {squad.map((r) => (
                      <div
                        key={`${r.id}-${r.player.id}`}
                        className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0 text-sm"
                      >
                        {r.player.image_url ? (
                          <img
                            src={r.player.image_url}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-white/5" />
                        )}
                        <span className="flex-1 truncate">{r.player.name}</span>
                        <Badge
                          className={
                            CATEGORY_COLORS[r.player.grade as Category] ??
                            "bg-white/5 text-white/70 border-white/10"
                          }
                        >
                          {r.player.grade}
                        </Badge>
                        <span className="text-[10px] font-mono text-white/50">
                          {formatINR(r.price, { compact: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}