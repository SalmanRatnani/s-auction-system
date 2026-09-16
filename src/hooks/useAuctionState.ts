"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

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
      participation_history: string | null;
      playing_centre: string | null;
      played_mira_bhayandar: boolean | null;
    } | null;
  } | null;
  highestBid: {
    id: string;
    amount: number;
    team_id: string;
    created_at: string;
  } | null;
  counts: Record<string, number>;
  teams: Array<{
    id: string;
    name: string;
    logo_url: string | null;
    captain_user_id: string | null;
    initial_purse: number;
    remaining_purse: number;
    spent: number;
    squad_count: number;
  }>;
};

export function useAuctionState(auctionId: string, pollMs = 0) {
  const [state, setState] = useState<AuctionStateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/auction/${auctionId}/state`, {
      cache: "no-store",
    });
    if (res.ok) {
      setState((await res.json()) as AuctionStateResponse);
    }
    setLoading(false);
  }, [auctionId]);

  useEffect(() => {
    refresh();

    const supabase = createClient();
    const channel = supabase
      .channel(`auction-${auctionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "auction_players", filter: `auction_id=eq.${auctionId}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bids", filter: `auction_id=eq.${auctionId}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "auctions", filter: `id=eq.${auctionId}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purse_ledger", filter: `auction_id=eq.${auctionId}` },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId, refresh]);

  // Optional polling fallback (set pollMs = 2000 when realtime is unreliable)
  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
  }, [pollMs, refresh]);

  return { state, loading, refresh };
}