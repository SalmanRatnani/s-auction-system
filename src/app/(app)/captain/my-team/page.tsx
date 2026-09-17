import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamEditor } from "./TeamEditor";
import { formatINR } from "@/lib/utils";
import { toneForGrade } from "@/constants/categories";
import { getOrCreateDraftAuction } from "@/lib/auction";

export const dynamic = "force-dynamic";

export default async function MyTeamPage() {
  return (
    <RoleGuard allow={["CAPTAIN", "MAIN_CONTROLLER"]}>
      <Inner />
    </RoleGuard>
  );
}

async function Inner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const auction = await getOrCreateDraftAuction();
  if (!auction) return <div className="text-[var(--danger)]">No auction.</div>;

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, logo_url, captain_user_id, initial_purse")
    .eq("auction_id", auction.id)
    .eq("captain_user_id", user!.id)
    .maybeSingle();

  if (!team) {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Waiting for team assignment</CardTitle>
          </CardHeader>
          <CardBody className="text-[13px] text-[var(--fg-3)]">
            The Main Controller hasn&apos;t assigned you to a team yet.
          </CardBody>
        </Card>
      </div>
    );
  }

  const { data: rosterRaw } = await supabase
    .from("team_players")
    .select(`
      id, price, acquired_via, won_at,
      player:players (id, player_code, name, grade, image_url)
    `)
    .eq("auction_id", auction.id)
    .eq("team_id", team.id)
    .order("won_at", { ascending: true });

  const roster = (rosterRaw ?? [])
    .map((r) => {
      const p = Array.isArray(r.player) ? r.player[0] : r.player;
      if (!p) return null;
      return { id: r.id, price: r.price, acquired_via: r.acquired_via, player: p };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const { data: purseRow } = await supabase
    .from("team_purses")
    .select("remaining_purse, spent, squad_count")
    .eq("team_id", team.id)
    .maybeSingle();

  const remaining = Number(purseRow?.remaining_purse ?? team.initial_purse);
  const spent = Number(purseRow?.spent ?? 0);
  const squadCount = Number(purseRow?.squad_count ?? roster.length);
  const config = (auction.config ?? {}) as { maxSquad?: number };
  const maxSquad = config.maxSquad ?? 18;

  return (
    <div className="space-y-6 max-w-4xl animate-fade-up">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">My Team</h1>
        <p className="text-[13px] text-[var(--fg-3)] mt-1">
          {team.name} · {squadCount}/{maxSquad} players
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Remaining purse" value={formatINR(remaining, { compact: true })} accent />
        <Stat label="Spent" value={formatINR(spent, { compact: true })} />
        <Stat label="Squad" value={`${squadCount} / ${maxSquad}`} />
      </div>

      <TeamEditor team={team} />

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <CardBody>
          {roster.length === 0 ? (
            <p className="text-[13px] text-[var(--fg-4)] py-2">
              No players yet. Start bidding on the Bid page.
            </p>
          ) : (
            <div className="space-y-0.5">
              {roster.map((r) => (
                <Link
                  key={r.id}
                  href={`/captain/teams?highlight=${r.player.id}`}
                  className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-[var(--bg-2)] transition-colors"
                >
                  {r.player.image_url ? (
                    <img
                      src={r.player.image_url}
                      alt=""
                      className="h-9 w-9 rounded-md object-cover border border-[var(--line-1)]"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-md bg-[var(--bg-2)] border border-[var(--line-1)]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[var(--fg-1)] truncate">
                      {r.player.name}
                    </div>
                    <div className="text-[10px] font-mono text-[var(--fg-4)]">
                      {r.player.player_code}
                    </div>
                  </div>
                  <Badge tone={toneForGrade(r.player.grade)}>{r.player.grade}</Badge>
                  <div className="text-[13px] font-mono text-[var(--accent)] tnum w-20 text-right">
                    {formatINR(r.price, { compact: true })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
          {label}
        </div>
        <div
          className={`text-[22px] font-semibold mt-1.5 tnum ${
            accent ? "text-[var(--accent)]" : "text-[var(--fg-1)]"
          }`}
        >
          {value}
        </div>
      </CardBody>
    </Card>
  );
}