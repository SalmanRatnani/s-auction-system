"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { toneForGrade } from "@/constants/categories";
import { TeamLogo } from "@/components/branding/TeamLogo";

type Team = { id: string; name: string; logo_url?: string | null };
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
    playing_centre: string | null;
    playing_hand: string | null;
  };
  highestBid: {
    id: string;
    amount: number;
    team_id: string;
    created_at: string;
  } | null;
  basePrice: number;
  currentBid: number | null;
  teams?: Team[];
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const leader =
    highestBid && teams ? teams.find((t) => t.id === highestBid.team_id) : null;
  const initials = player.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
  return (
    <section
      key={player.id}
      className="player-spotlight animate-player-reveal"
      aria-label="Player on the block"
    >
      <div className="player-spotlight-grid">
        <div className="player-portrait">
          {player.image_url && failedImage !== player.image_url ? (
            <img
              src={player.image_url}
              alt={player.name}
              onError={() => setFailedImage(player.image_url)}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="player-placeholder">
              <strong>{initials}</strong>
              <span>PLAYER ON THE BLOCK</span>
            </div>
          )}
        </div>
        <div className="player-info">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge tone={toneForGrade(player.grade)}>{player.grade}</Badge>
            <span className="eyebrow">{player.player_code}</span>
          </div>
          <h2>{player.name}</h2>
          <div className="flex flex-wrap gap-x-7 gap-y-4 mt-6">
            {player.playing_centre && (
              <Meta label="Playing centre" value={player.playing_centre} />
            )}
            {player.playing_hand && (
              <Meta label="Playing hand" value={player.playing_hand} />
            )}
          </div>
          {player.achievements && (
            <div className="mt-6 border-t border-[var(--line-2)] pt-4">
              <span className="eyebrow">PLAYER HIGHLIGHTS</span>
              <p className="text-[12px] leading-6 text-[var(--fg-2)] mt-2 whitespace-pre-wrap break-words">
                {player.achievements}
              </p>
            </div>
          )}
        </div>
        <div className="player-bid">
          <div>
            <span className="eyebrow">BASE PRICE</span>
            <p className="text-lg mt-2 tnum">
              {formatINR(basePrice, { compact: true })}
            </p>
            <p className="text-[9px] mt-1 text-[var(--fg-3)]">
              Virtual auction credits
            </p>
          </div>
          <div>
            <span className="eyebrow !text-[var(--accent)]">CURRENT BID</span>
            <p
              className="player-bid-amount tnum"
              aria-live="polite"
              aria-atomic="true"
            >
              <span
                key={highestBid?.id ?? currentBid ?? "no-bid"}
                className={currentBid ? "amount-update" : undefined}
              >
                {currentBid && currentBid > 0
                  ? formatINR(currentBid, { compact: true })
                  : "Awaiting bid"}
              </span>
            </p>
            {leader && (
              <div
                key={leader.id}
                className="flex items-center gap-2 mt-4 animate-fade-in"
              >
                <TeamLogo
                  name={leader.name}
                  src={leader.logo_url}
                  className="!w-8 !h-8"
                />
                <div className="min-w-0">
                  <span className="text-[8px] tracking-widest text-[var(--fg-3)]">
                    LEADING TEAM
                  </span>
                  <p className="text-[11px] mt-1 break-words">{leader.name}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="eyebrow">{label}</span>
      <p className="text-[12px] text-[var(--fg-2)] mt-1 break-words">{value}</p>
    </div>
  );
}
