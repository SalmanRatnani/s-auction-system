import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";
import { toneForGrade } from "@/constants/categories";

export type PlayerProfileData = {
  id: string;
  player_code: string;
  name: string;
  age: number | null;
  grade: string;
  image_url: string | null;
  playing_centre: string | null;
  played_mira_bhayandar: boolean | null;
  achievements: string | null;
  // Sale info (if sold)
  sale: {
    team_id: string;
    team_name: string;
    price: number;
  } | null;
};

export function PlayerProfile({
  player,
  backHref,
}: {
  player: PlayerProfileData;
  backHref: string;
}) {
  return (
    <div className="space-y-6 max-w-3xl animate-fade-up">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--fg-3)] hover:text-[var(--fg-1)] transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back
      </Link>

      <Card className="overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* Photo */}
          <div className="sm:w-[200px] shrink-0 border-b sm:border-b-0 sm:border-r border-[var(--line-1)] bg-[var(--bg-0)]">
            {player.image_url ? (
              <img
                src={player.image_url}
                alt={player.name}
                className="h-56 sm:h-full w-full object-cover"
              />
            ) : (
              <div className="h-56 sm:h-full w-full grid place-items-center bg-[var(--bg-2)]">
                <span className="text-[11px] text-[var(--fg-4)] uppercase tracking-widest">
                  No photo
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 p-6 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={toneForGrade(player.grade)}>{player.grade}</Badge>
              <span className="text-[11px] font-mono text-[var(--fg-4)] tracking-wide">
                {player.player_code}
              </span>
            </div>

            <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-tight mt-3">
              {player.name}
            </h1>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-5 text-[13px]">
              {player.age != null && (
                <Meta label="Age" value={`${player.age}`} />
              )}
              {player.playing_centre && (
                <Meta label="Playing centre" value={player.playing_centre} />
              )}
              {player.played_mira_bhayandar !== null && (
                <Meta
                  label="Mira Bhayandar"
                  value={player.played_mira_bhayandar ? "Yes" : "No"}
                />
              )}
            </div>
          </div>
        </div>
      </Card>

      {player.achievements && (
        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-[13px] text-[var(--fg-2)] whitespace-pre-wrap leading-relaxed">
              {player.achievements}
            </p>
          </CardBody>
        </Card>
      )}

      {player.sale && (
        <Card>
          <CardHeader>
            <CardTitle>Sold to</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[14px] font-medium text-[var(--fg-1)]">
                  {player.sale.team_name}
                </div>
                <div className="text-[11px] text-[var(--fg-4)] mt-0.5">
                  Auction winner
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
                  Price
                </div>
                <div className="text-[16px] font-semibold text-[var(--accent)] tnum mt-0.5">
                  {formatINR(player.sale.price, { compact: true })}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
        {label}
      </div>
      <div className="text-[13px] text-[var(--fg-1)] mt-0.5">{value}</div>
    </div>
  );
}