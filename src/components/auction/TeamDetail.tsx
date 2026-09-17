import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";
import { CATEGORY_COLORS, type Category } from "@/constants/categories";

export type TeamDetailData = {
  id: string;
  name: string;
  logo_url: string | null;
  captain_display: string | null;
  initial_purse: number;
  remaining_purse: number;
  spent: number;
  squad_count: number;
  maxSquad: number;
  roster: Array<{
    id: string;
    price: number;
    acquired_via: string;
    won_at: string;
    player: {
      id: string;
      player_code: string;
      name: string;
      grade: string;
      image_url: string | null;
      playing_centre: string | null;
    };
  }>;
};

export function TeamDetail({
  team,
  showPurse,
  backHref,
}: {
  team: TeamDetailData;
  showPurse: boolean;
  backHref: string;
}) {
  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
      >
        ← Back to live auction
      </Link>

      <header className="flex items-center gap-5">
        {team.logo_url ? (
          <img
            src={team.logo_url}
            alt=""
            className="h-20 w-20 md:h-24 md:w-24 rounded-2xl object-cover border border-white/10"
          />
        ) : (
          <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-white/5 border border-white/10 grid place-items-center text-3xl">
            🏸
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-display font-black truncate">
            {team.name}
          </h1>
          {team.captain_display && (
            <p className="text-sm text-white/50 mt-1">
              Captain: <span className="text-white/80">{team.captain_display}</span>
            </p>
          )}
          <p className="text-xs text-white/40 mt-0.5">
            {team.squad_count}/{team.maxSquad} players
          </p>
        </div>
      </header>

      {showPurse && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardBody>
              <div className="text-xs text-white/50 uppercase tracking-wider">
                Remaining purse
              </div>
              <div className="text-2xl font-bold text-emerald-300 mt-1">
                {formatINR(team.remaining_purse, { compact: true })}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-xs text-white/50 uppercase tracking-wider">
                Spent
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {formatINR(team.spent, { compact: true })}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <CardBody>
          {team.roster.length === 0 ? (
            <p className="text-sm text-white/40 py-4">
              No players won yet.
            </p>
          ) : (
            <div className="space-y-2">
              {team.roster.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
                >
                  {r.player.image_url ? (
                    <img
                      src={r.player.image_url}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover border border-white/10"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-white/5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.player.name}</div>
                    <div className="text-[10px] font-mono text-white/40">
                      {r.player.player_code}
                      {r.player.playing_centre
                        ? ` · ${r.player.playing_centre}`
                        : ""}
                    </div>
                  </div>
                  <Badge
                    className={
                      CATEGORY_COLORS[r.player.grade as Category] ??
                      "bg-white/5 text-white/70 border-white/10"
                    }
                  >
                    {r.player.grade}
                  </Badge>
                  <div className="text-sm font-mono text-emerald-300 w-24 text-right">
                    {formatINR(r.price, { compact: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}