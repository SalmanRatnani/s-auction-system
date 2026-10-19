"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export type LastSale = {
  /** team_players row id — changes on every new sale / captain assignment */
  id: string;
  price: number;
  acquired_via: string;
  won_at: string;
  player_name: string;
  grade: string | null;
  image_url: string | null;
  team_name: string;
};

export type AuctionStateResponse = {
  auction: {
    id: string;
    name: string;
    status: string;
    mode: string;
    config: Record<string, unknown>;
  } | null;
  current: {
    id: string;
    status: string;
    round: number;
    sold_price: number | null;
    sold_to_team_id: string | null;
    player: {
      id: string;
      player_code: string;
      name: string;
      grade: string;
      image_url: string | null;
      achievements: string | null;
      playing_centre: string | null;
      playing_hand: string | null;
    } | null;
    /** Set when the player on the block is a team's playing captain. */
    captainTeam?: { id: string; name: string } | null;
  } | null;
  highestBid: {
    id: string;
    amount: number;
    team_id: string;
    created_at: string;
  } | null;
  counts: Record<string, number>;
  /** Most recent sale in this auction — drives the SOLD celebration. */
  lastSale: LastSale | null;
  teams: Array<{
    id: string;
    name: string;
    logo_url: string | null;
    captain_user_id: string | null;
    initial_purse: number;
    remaining_purse: number;
    spent: number;
    squad_count: number;
    /** Categories (grades) this team already owns a player from. */
    won_grades: string[];
  }>;
};

export function useAuctionState(auctionId: string, pollMs = 2500) {
  const [state, setState] = useState<AuctionStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch(`/api/auction/${auctionId}/state`, {
        cache: "no-store",
      });
      if (res.ok) {
        setState((await res.json()) as AuctionStateResponse);
      }
    } catch {
      // network blip — next tick will retry
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [auctionId]);

  // Initial load + realtime subscription
  useEffect(() => {
    refresh();

    const supabase = createClient();
    const channel = supabase
      .channel(`auction-${auctionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bids",
          filter: `auction_id=eq.${auctionId}`,
        },
        () => refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auction_players",
          filter: `auction_id=eq.${auctionId}`,
        },
        () => refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auctions",
          filter: `id=eq.${auctionId}`,
        },
        () => refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "purse_ledger",
          filter: `auction_id=eq.${auctionId}`,
        },
        () => refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_players",
          filter: `auction_id=eq.${auctionId}`,
        },
        () => refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
          filter: `auction_id=eq.${auctionId}`,
        },
        () => refresh()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Catch up immediately after the channel is live
          refresh();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId, refresh]);

  // Polling fallback (default 2.5s) — belt and braces
  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
  }, [pollMs, refresh]);

  // Refresh on tab focus — user switched back to the tab
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  return { state, loading, refresh };
}