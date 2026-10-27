import { createAuthorizedReader } from "@/lib/security/page-access";
import { TeamLogo } from "@/components/branding/TeamLogo";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOrCreateDraftAuction } from "@/lib/auction";
import { formatINR } from "@/lib/utils";
import { toneForGrade } from "@/constants/categories";
import { ArrowRight } from "lucide-react";

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
  const reader = await createAuthorizedReader([
    "CAPTAIN",
    "MAIN_CONTROLLER",
    "AUCTIONEER",
    "VIEWER",
  ]);
  const auction = await getOrCreateDraftAuction();
  if (!auction) return <div className="text-[var(--danger)]">No auction.</div>;

  const config = (auction.config ?? {}) as { maxSquad?: number };
  const maxSquad = config.maxSquad ?? 18;

  const { data: teams } = await reader
    .from("teams")
    .select("id, name, logo_url, captain_user_id, initial_purse, created_at")
    .eq("auction_id", auction.id)
    .order("created_at", { ascending: true });

  // Squad counts only — no purse
  const { data: purses } = await reader
    .from("team_purses")
    .select("team_id, squad_count")
    .eq("auction_id", auction.id);

  const squadByTeam: Record<string, number> = {};
  (purses ?? []).forEach((p) => {
    squadByTeam[p.team_id] = Number(p.squad_count ?? 0);
  });

  const { data: rosters } = await reader
    .from("team_players")
    .select(
      `
      team_id, price, won_at,
      player:players (id, player_code, name, grade, image_url)
    `,
    )
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
        <h1 className="text-[22px] font-semibold tracking-tight">All Teams</h1>
        <p className="text-[13px] text-[var(--fg-3)] mt-1">
          <span className="tnum">{teams?.length ?? 0}</span> teams · tap a card
          to view the roster
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {(teams ?? []).map((t) => {
          const squad = byTeam[t.id] ?? [];
          const squadCount = squadByTeam[t.id] ?? squad.length;
          return (
            <Link
              key={t.id}
              href={`/viewer/team/${t.id}`}
              className="group block"
            >
              <Card className="h-full hover:border-[var(--accent-line)] transition-colors duration-100 cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <TeamLogo
                      name={t.name}
                      src={t.logo_url}
                      className="!w-12 !h-12 mx-auto"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium text-[var(--fg-1)] truncate">
                        {t.name}
                      </div>
                      <div className="text-[11px] text-[var(--fg-4)] tnum">
                        {squadCount}/{maxSquad} players
                      </div>
                    </div>
                    <ArrowRight
                      size={14}
                      strokeWidth={2}
                      className="text-[var(--fg-4)] transition-transform duration-100 group-hover:translate-x-0.5 group-hover:text-[var(--fg-2)]"
                    />
                  </div>
                </CardHeader>

                <CardBody className="space-y-3">
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
