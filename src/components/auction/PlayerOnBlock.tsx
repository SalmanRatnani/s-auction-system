"use client";

import { formatINR } from "@/lib/utils";
import { CATEGORY_COLORS, DEFAULT_BASE_PRICES, type Category } from "@/constants/categories";

export function PlayerOnBlock({
  player,
  highestBid,
  basePrice,
  currentBid,
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
}) {
  const gradeClass =
    CATEGORY_COLORS[player.grade as Category] ??
    "bg-white/5 text-white/70 border-white/10";

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-950/60 to-blue-950/60 p-6 md:p-8">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {player.image_url ? (
          <img
            src={player.image_url}
            alt={player.name}
            className="h-32 w-32 md:h-40 md:w-40 rounded-2xl object-cover border-2 border-emerald-400/40 shadow-2xl shadow-emerald-500/20"
          />
        ) : (
          <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl bg-white/5 border-2 border-white/10 grid place-items-center text-4xl">
            🏸
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${gradeClass}`}>
              {player.grade}
            </span>
            <span className="text-xs text-white/40 font-mono">
              {player.player_code}
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-black mt-3 truncate">
            {player.name}
          </h2>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {player.playing_centre && (
              <div>
                <div className="text-white/40 text-xs uppercase tracking-wider">Playing centre</div>
                <div className="text-white/90">{player.playing_centre}</div>
              </div>
            )}
            {player.played_mira_bhayandar !== null && (
              <div>
                <div className="text-white/40 text-xs uppercase tracking-wider">Mira Bhayandar</div>
                <div className="text-white/90">
                  {player.played_mira_bhayandar ? "Played" : "Not played"}
                </div>
              </div>
            )}
          </div>

          {player.achievements && (
            <div className="mt-4">
              <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Achievements</div>
              <p className="text-white/90 text-sm whitespace-pre-wrap">{player.achievements}</p>
            </div>
          )}

          {player.participation_history && (
            <div className="mt-3">
              <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Participation</div>
              <p className="text-white/70 text-sm whitespace-pre-wrap">{player.participation_history}</p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-black/30 border border-white/10 p-4">
              <div className="text-white/40 text-xs uppercase tracking-wider">Base price</div>
              <div className="text-2xl font-bold text-white mt-1">
                {formatINR(basePrice, { compact: true })}
              </div>
            </div>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
              <div className="text-emerald-300/70 text-xs uppercase tracking-wider">
                Current bid
              </div>
              <div className="text-2xl font-bold text-emerald-300 mt-1">
                {currentBid && currentBid > 0
                  ? formatINR(currentBid, { compact: true })
                  : "—"}
              </div>
            </div>
          </div>

          {highestBid && (
            <p className="text-xs text-white/50 mt-3">
              Leading bid placed at{" "}
              {new Date(highestBid.created_at).toLocaleTimeString("en-IN")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}