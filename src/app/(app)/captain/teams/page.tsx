import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOrCreateDraftAuction } from "@/lib/auction";
import { formatINR } from "@/lib/utils";
import { toneForGrade } from "@/constants/categories";

export const dynamic = "force-dynamic";

export default async function AllTeamsPage() {
  return (
    <RoleGuard allow={["CAPTAIN", "MAIN_CONTROLLER", "AUCTIONEER", "VIEWER"]}>
      <Inner />
    </RoleGuard>
  );
}

async function Inner() {
  const supabase = await createClient();
  const auction = await getOrCreateDraftAuction();
  if (!auction) return <div className="text-[var(--danger)]">No auction.</div>;

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

  const purseByTeam: Record<
    string,
    { remaining_purse: number; spent: number; squad_count: number }
  > = {};
  (purses ?? []).forEach((p) => {
    purseByTeam[p.team_id] = {
      remaining_purse: Number(p.remaining_purse ?? 0),
      spent: Number(p.spent ?? 0),
      squad_count: Number(p.squad_count ?? 0),
    };
  });

  const { data: rosters } = await supabase
    .from("team_players")
    .select(`
      team_id, price, won_at,
      player:players (id, player_code, name, grade, image_url)
    `)
    .eq("auction_id", auction.id)
    .order("won_at", { ascending: true });

  type RosterRow = {
    team_id: string;
    price: number;
    player: {
      id: string;
      player_code: string;
      name: string;
      grade: string;
      image_url: string | null;
    };
  };

  const byTeam: Record<string, RosterRow[]> = {};
  (rosters ?? []).forEach((r) => {
    const p = Array.isArray(r.player) ? r.player[0] : r.player;
    if (!p) return;
    (byTeam[r.team_id] ??= []).push({
      team_id: r.team_id,
      price: r.price,
      player: p,
    });
  });

  return (
    <div className="space-y-6 max-w-6xl animate-fade-up">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">All Teams</h1>
        <p className="text-[13px] text-[var(--fg-3)] mt-1">
          {teams?.length ?? 0} teams
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
                      className="h-10 w-10 rounded-md object-cover border border-[var(--line-1)]"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-[var(--bg-2)] border border-[var(--line-1)] grid place-items-center text-[10px] text-[var(--fg-4)] font-mono">
                      {t.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate text-[14px]">{t.name}</CardTitle>
                    <div className="text-[11px] text-[var(--fg-4)] tnum">
                      {squadCount}/{maxSquad} players
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                {canSeePurse && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-[var(--accent-line)] bg-[var(--accent-bg)] p-2">
                      <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--accent)]">
                        Remaining
                      </div>
                      <div className="text-[13px] font-semibold text-[var(--accent)] mt-0.5 tnum">
                        {formatINR(remaining, { compact: true })}
                      </div>
                    </div>
                    <div className="rounded-md border border-[var(--line-1)] bg-[var(--bg-0)] p-2">
                      <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
                        Spent
                      </div>
                      <div className="text-[13px] font-semibold text-[var(--fg-1)] mt-0.5 tnum">
                        {formatINR(purse?.spent ?? 0, { compact: true })}
                      </div>
                    </div>
                  </div>
                )}

                {squad.length === 0 ? (
                  <p className="text-[12px] text-[var(--fg-4)] py-2">
                    No players yet.
                  </p>
                ) : (
                  <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1">
                    {squad.map((r) => (
                      <div
                        key={`${r.team_id}-${r.player.id}`}
                        className="flex items-center gap-2 py-1.5 border-b border-[var(--line-1)] last:border-0"
                      >
                        {r.player.image_url ? (
                          <img
                            src={r.player.image_url}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover border border-[var(--line-1)]"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-[var(--bg-2)] border border-[var(--line-1)]" />
                        )}
                        <span className="flex-1 truncate text-[12px] text-[var(--fg-1)]">
                          {r.player.name}
                        </span>
                        <Badge tone={toneForGrade(r.player.grade)}>
                          {r.player.grade}
                        </Badge>
                        <span className="text-[11px] font-mono text-[var(--fg-3)] tnum w-16 text-right">
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