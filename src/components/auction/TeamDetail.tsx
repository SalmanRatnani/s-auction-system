import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";
import { toneForGrade } from "@/constants/categories";

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
    };
  }>;
};

export function TeamDetail({
  team,
  showPurse,
  backHref,
  playerLinkBase,
}: {
  team: TeamDetailData;
  showPurse: boolean;
  backHref: string;
  playerLinkBase?: string; // e.g. "/player" or "/watch/<token>/player"
}) {
  return (
    <div className="space-y-6 max-w-4xl animate-fade-up">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--fg-3)] hover:text-[var(--fg-1)] transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back
      </Link>

      <header className="flex items-center gap-5">
        {team.logo_url ? (
          <img
            src={team.logo_url}
            alt=""
            className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-cover border border-[var(--line-1)]"
          />
        ) : (
          <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl bg-[var(--bg-2)] border border-[var(--line-1)] grid place-items-center text-[13px] font-mono text-[var(--fg-4)]">
            {team.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-[24px] md:text-[28px] font-semibold tracking-tight truncate">
            {team.name}
          </h1>
          {team.captain_display && (
            <p className="text-[13px] text-[var(--fg-3)] mt-1">
              Captain:{" "}
              <span className="text-[var(--fg-1)]">
                {team.captain_display}
              </span>
            </p>
          )}
          <p className="text-[11px] text-[var(--fg-4)] tnum mt-0.5">
            {team.squad_count}/{team.maxSquad} players
          </p>
        </div>
      </header>

      {showPurse && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardBody className="p-4">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
                Remaining purse
              </div>
              <div className="text-[22px] font-semibold text-[var(--accent)] tnum mt-1.5">
                {formatINR(team.remaining_purse, { compact: true })}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-4">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
                Spent
              </div>
              <div className="text-[22px] font-semibold text-[var(--fg-1)] tnum mt-1.5">
                {formatINR(team.spent, { compact: true })}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Roster
            {playerLinkBase && (
              <span className="ml-2 text-[11px] font-normal text-[var(--fg-4)]">
                tap a player to view profile
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardBody>
          {team.roster.length === 0 ? (
            <p className="text-[13px] text-[var(--fg-4)] py-2">
              No players won yet.
            </p>
          ) : (
            <div className="space-y-0.5">
              {team.roster.map((r) => {
                const inner = (
                  <div className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md transition-colors hover:bg-[var(--bg-2)]">
                    {r.player.image_url ? (
                      <img
                        src={r.player.image_url}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover border border-[var(--line-1)]"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-[var(--bg-2)] border border-[var(--line-1)]" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[var(--fg-1)] truncate">
                        {r.player.name}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--fg-4)]">
                        {r.player.player_code}
                      </div>
                    </div>
                    <Badge tone={toneForGrade(r.player.grade)}>
                      {r.player.grade}
                    </Badge>
                    <div className="text-[13px] font-mono text-[var(--accent)] tnum w-20 text-right">
                      {formatINR(r.price, { compact: true })}
                    </div>
                    {playerLinkBase && (
                      <ChevronRight
                        size={14}
                        strokeWidth={1.75}
                        className="text-[var(--fg-4)] shrink-0"
                      />
                    )}
                  </div>
                );

                return playerLinkBase ? (
                  <Link
                    key={r.id}
                    href={`${playerLinkBase}/${r.player.id}`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={r.id}>{inner}</div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}