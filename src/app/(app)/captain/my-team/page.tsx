import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamEditor } from "./TeamEditor";
import { formatINR } from "@/lib/utils";
import { CATEGORY_COLORS, type Category } from "@/constants/categories";
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
  if (!auction) return <div className="text-red-300">No auction.</div>;

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
          <CardBody className="text-white/60 text-sm">
            The Main Controller hasn't assigned you to a team yet.
          </CardBody>
        </Card>
      </div>
    );
  }

  // Roster
  const { data: rosterRaw } = await supabase
    .from("team_players")
    .select(`
      id, price, acquired_via, won_at,
      player:players (id, player_code, name, grade, image_url)
    `)
    .eq("auction_id", auction.id)
    .eq("team_id", team.id)
    .order("won_at", { ascending: true });

  const roster = (rosterRaw ?? []).map((r) => {
    const p = Array.isArray(r.player) ? r.player[0] : r.player;
    return {
      id: r.id,
      price: r.price,
      acquired_via: r.acquired_via,
      player: p,
    };
  }).filter((r) => r.player);

  // Purse
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
    <div className="space-y-6 max-w-5xl">
      <header>
        <h1 className="text-3xl font-bold">My Team</h1>
        <p className="text-white/50 text-sm mt-1">
          {team.name} · {squadCount}/{maxSquad} players
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Remaining purse" value={formatINR(remaining, { compact: true })} accent="emerald" />
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
            <p className="text-sm text-white/40">
              No players yet. Start bidding on the Bid page.
            </p>
          ) : (
            <div className="space-y-2">
              {roster.map((r) => (
                <Link
                  key={r.id}
                  href={`/captain/teams?highlight=${r.player!.id}`}
                  className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 hover:bg-white/5 rounded -mx-2 px-2"
                >
                  {r.player!.image_url ? (
                    <img
                      src={r.player!.image_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-white/5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.player!.name}</div>
                    <div className="text-[10px] font-mono text-white/40">
                      {r.player!.player_code}
                    </div>
                  </div>
                  <Badge
                    className={
                      CATEGORY_COLORS[r.player!.grade as Category] ??
                      "bg-white/5 text-white/70 border-white/10"
                    }
                  >
                    {r.player!.grade}
                  </Badge>
                  <div className="text-sm font-mono text-emerald-300">
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
  accent?: "emerald";
}) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs text-white/50 uppercase tracking-wider">{label}</div>
        <div
          className={`text-2xl font-bold mt-1 ${
            accent === "emerald" ? "text-emerald-300" : "text-white"
          }`}
        >
          {value}
        </div>
      </CardBody>
    </Card>
  );
}