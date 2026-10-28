import { CATEGORY_ORDER, getBasePrice } from "@/constants/categories";
import type { AuctionStateResponse } from "@/hooks/useAuctionState";

type Team = {
  id: string;
  name: string;
  logo_url: string | null;
  captain_user_id: string | null;
  co_captain_user_id: string | null;
  captain_player_id: string | null;
  co_captain_player_id: string | null;
  initial_purse: number;
};
export type Snapshot = {
  auction: NonNullable<AuctionStateResponse["auction"]>;
  current: AuctionStateResponse["current"];
  highestBid: AuctionStateResponse["highestBid"];
  lastSale: AuctionStateResponse["lastSale"];
  teams: Team[];
  purses: {
    team_id: string;
    remaining_purse: number;
    spent: number;
    squad_count: number;
  }[];
  rosters: {
    team_id: string;
    player_id: string;
    grade: string;
    price: number;
    acquired_via: string;
  }[];
  pending: { player_id: string; grade: string }[];
  captains: { id: string; grade: string }[];
};

export function projectAuctionSnapshot(
  raw: Snapshot,
  role: string,
  userId: string | null,
): AuctionStateResponse {
  const staff = role === "MAIN_CONTROLLER" || role === "AUCTIONEER";
  const captain = role === "CAPTAIN";
  const config = raw.auction.config ?? {};
  const reservedIds = new Set(
    raw.teams
      .flatMap((t) => [t.captain_player_id, t.co_captain_player_id])
      .filter(Boolean),
  );
  const allotted = new Set(raw.rosters.map((r) => r.player_id));
  const grades = new Map(raw.captains.map((p) => [p.id, p.grade]));
  const counts: Record<string, number> = {};
  if (staff || config.showPoolCounts !== false) {
    CATEGORY_ORDER.forEach((g) => (counts[g] = 0));
    raw.pending.forEach((p) => {
      if (!reservedIds.has(p.player_id))
        counts[p.grade] = (counts[p.grade] ?? 0) + 1;
    });
  }
  const teams = raw.teams.map((t) => {
    const own =
      !!userId &&
      captain &&
      [t.captain_user_id, t.co_captain_user_id].includes(userId);
    const visible =
      staff ||
      own ||
      (captain
        ? config.showPurseToCaptains !== false
        : config.showPurseToViewers === true);
    const purse = raw.purses.find((p) => p.team_id === t.id);
    if (!purse) throw new Error("Incomplete purse snapshot");
    const slots = [t.captain_player_id, t.co_captain_player_id].filter(
      (id): id is string => !!id && !allotted.has(id),
    );
    const reservedGrades = slots
      .map((id) => grades.get(id))
      .filter((g): g is string => !!g);
    const estimated = reservedGrades.reduce((total, grade) => {
      const sales = raw.rosters.filter(
        (r) => r.grade === grade && r.acquired_via !== "MANUAL_ALLOT",
      );
      return (
        total +
        (sales.length
          ? Math.round(
              sales.reduce((sum, r) => sum + Number(r.price), 0) / sales.length,
            )
          : getBasePrice(config, grade))
      );
    }, 0);
    return {
      id: t.id,
      name: t.name,
      logo_url: t.logo_url,
      captain_user_id: staff || captain ? t.captain_user_id : null,
      co_captain_user_id: staff || captain ? t.co_captain_user_id : null,
      initial_purse: visible ? Number(t.initial_purse) : 0,
      remaining_purse: visible ? Number(purse.remaining_purse) : 0,
      spent: visible ? Number(purse.spent) : 0,
      purse_visible: visible,
      squad_count: Number(purse.squad_count),
      won_grades: raw.rosters
        .filter((r) => r.team_id === t.id)
        .map((r) => r.grade),
      reserved_grades: reservedGrades,
      reserved_slots: slots.length,
      captain_settlement_estimate: staff || own ? estimated : 0,
      captain_settlement_shortfall:
        staff || own
          ? Math.max(0, estimated - Number(purse.remaining_purse))
          : 0,
    };
  });
  const reservedTeam = raw.current?.player
    ? raw.teams.find((t) =>
        [t.captain_player_id, t.co_captain_player_id].includes(
          raw.current!.player!.id,
        ),
      )
    : null;
  return {
    auction: {
      id: raw.auction.id,
      name: raw.auction.name,
      status: raw.auction.status,
      mode: raw.auction.mode,
      config,
      state_version: Number(raw.auction.state_version),
    },
    current: raw.current
      ? {
          ...raw.current,
          captainTeam: reservedTeam
            ? { id: reservedTeam.id, name: reservedTeam.name }
            : null,
        }
      : null,
    highestBid: raw.highestBid,
    counts,
    lastSale: raw.lastSale,
    teams,
  };
}
