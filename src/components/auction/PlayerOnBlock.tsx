"use client";

import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { toneForGrade } from "@/constants/categories";

type Team = { id: string; name: string };

export function PlayerOnBlock({
  player,
  highestBid,
  basePrice,
  currentBid,
  teams,
}: {
  player: {
    id: string;
    player_code: string;
    name: string;
    grade: string;
    image_url: string | null;
    achievements: string | null;
    participation_history: string | null;
    playing_centre: string | null;
    played_mira_bhayandar: boolean | null;
  };
  highestBid: { id: string; amount: number; team_id: string; created_at: string } | null;
  basePrice: number;
  currentBid: number | null;
  teams?: Team[];
}) {
  const leader =
    highestBid && teams ? teams.find((t) => t.id === highestBid.team_id) : null;

  return (
    <div className="rounded-xl border border-[var(--line-1)] bg-[var(--bg-1)] overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Photo */}
<div className="md:w-[220px] shrink-0 md:border-r border-b md:border-b-0 border-[var(--line-1)] bg-[var(--bg-0)]">
  {player.image_url ? (
    <img
      src={player.image_url}
      alt={player.name}
      className="w-full h-auto max-h-[420px] object-contain md:h-full md:max-h-none md:object-cover"
    />
  ) : (
    <div className="h-48 md:h-full w-full grid place-items-center bg-[var(--bg-2)]">
      <span className="text-[11px] text-[var(--fg-4)] uppercase tracking-widest">
        No photo
      </span>
    </div>
  )}
</div>

        {/* Body */}
        <div className="flex-1 p-6 md:p-8 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={toneForGrade(player.grade)}>{player.grade}</Badge>
            <span className="text-[11px] font-mono text-[var(--fg-4)] tracking-wide">
              {player.player_code}
            </span>
          </div>

          <h2 className="text-[32px] md:text-[40px] font-semibold tracking-[-0.02em] leading-[1.1] mt-3 truncate">
            {player.name}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-6">
            {player.playing_centre && (
              <Meta label="Playing centre" value={player.playing_centre} />
            )}
            {player.played_mira_bhayandar !== null && (
              <Meta
                label="Mira Bhayandar"
                value={player.played_mira_bhayandar ? "Played" : "Not played"}
              />
            )}
          </div>

          {player.achievements && (
            <div className="mt-6">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
                Achievements
              </div>
              <p className="text-[13px] text-[var(--fg-2)] mt-1.5 whitespace-pre-wrap leading-relaxed">
                {player.achievements}
              </p>
            </div>
          )}

          {player.participation_history && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
                Participation
              </div>
              <p className="text-[13px] text-[var(--fg-3)] mt-1.5 whitespace-pre-wrap leading-relaxed">
                {player.participation_history}
              </p>
            </div>
          )}
        </div>

        {/* Bid panel */}
        <div className="md:w-[240px] shrink-0 border-t md:border-t-0 md:border-l border-[var(--line-1)] p-5 md:p-6 flex flex-col gap-5 bg-[var(--bg-0)]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
              Base price
            </div>
            <div className="text-[20px] font-medium text-[var(--fg-1)] mt-1.5 tnum">
              {formatINR(basePrice, { compact: true })}
            </div>
          </div>

          <div className="border-t border-[var(--line-1)] pt-5">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--accent)]">
              Current bid
            </div>
            <div className="text-[32px] md:text-[36px] font-semibold text-[var(--accent)] mt-1.5 tnum leading-none">
              {currentBid && currentBid > 0
                ? formatINR(currentBid, { compact: true })
                : "—"}
            </div>
            {leader && (
              <div className="text-[12px] text-[var(--fg-3)] mt-2 truncate">
                Leading: <span className="text-[var(--fg-1)]">{leader.name}</span>
              </div>
            )}
            {highestBid && (
              <div className="text-[11px] text-[var(--fg-4)] mt-1 tabular-nums">
                {new Date(highestBid.created_at).toLocaleTimeString("en-IN")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
        {label}
      </div>
      <div className="text-[13px] text-[var(--fg-1)] mt-0.5">{value}</div>
    </div>
  );
}