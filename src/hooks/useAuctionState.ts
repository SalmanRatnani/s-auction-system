"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { auctionStateError } from "@/lib/auction-availability";

export type LastSale = {
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
    state_version: number;
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
    captainTeam?: { id: string; name: string } | null;
  } | null;
  highestBid: {
    id: string;
    amount: number;
    team_id: string;
    created_at: string;
  } | null;
  counts: Record<string, number>;
  lastSale: LastSale | null;
  teams: Array<{
    id: string;
    name: string;
    logo_url: string | null;
    captain_user_id: string | null;
    co_captain_user_id: string | null;
    initial_purse: number;
    purse_visible?: boolean;
    captain_settlement_estimate?: number;
    captain_settlement_shortfall?: number;
    remaining_purse: number;
    spent: number;
    squad_count: number;
    won_grades: string[];
    reserved_grades: string[];
    reserved_slots: number;
  }>;
};

type BidUpdate = {
  id: string;
  auction_player_id: string;
  team_id: string;
  amount: number;
  created_at: string;
  is_undone?: boolean;
};

/**
 * Bids use the Realtime payload directly; no HTTP round trip is needed to
 * show a new leader. Full snapshots still reconcile sales, undo and purses.
 */
export function useAuctionState(
  auctionId: string,
  pollMs = 2500,
  viewerToken?: string,
) {
  const [state, setState] = useState<AuctionStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [stale, setStale] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastSuccess = useRef(0);
  const failures = useRef(0);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const needsRefreshRef = useRef(false);
  const requestSequenceRef = useRef(0);
  const recentBidRef = useRef<BidUpdate | null>(null);

  const applyBid = useCallback((bid: BidUpdate) => {
    if (
      !bid?.id ||
      !bid.auction_player_id ||
      !bid.team_id ||
      !Number.isSafeInteger(Number(bid.amount)) ||
      bid.is_undone
    )
      return;

    const normalized: BidUpdate = { ...bid, amount: Number(bid.amount) };
    recentBidRef.current = normalized;
    requestSequenceRef.current += 1;

    setState((previous) => {
      if (!previous || previous.current?.id !== normalized.auction_player_id)
        return previous;
      const leader = previous.highestBid;
      if (leader && leader.amount > normalized.amount) return previous;
      if (
        leader &&
        leader.amount === normalized.amount &&
        new Date(leader.created_at).getTime() <=
          new Date(normalized.created_at).getTime()
      )
        return previous;
      return {
        ...previous,
        highestBid: {
          id: normalized.id,
          team_id: normalized.team_id,
          amount: normalized.amount,
          created_at: normalized.created_at,
        },
      };
    });
  }, []);

  const refresh = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    if (inFlightRef.current) {
      needsRefreshRef.current = true;
      return;
    }
    inFlightRef.current = true;
    const requestSequence = requestSequenceRef.current;
    const requestGeneration = generation.current;
    const abort = new AbortController();
    controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 8000);
    try {
      const suffix = viewerToken
        ? `?viewerToken=${encodeURIComponent(viewerToken)}`
        : "";
      const response = await fetch(`/api/auction/${auctionId}/state${suffix}`, {
        cache: "no-store",
        signal: abort.signal,
      });
      if (requestGeneration !== generation.current) return;
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (requestGeneration !== generation.current) return;
        if ([401, 403, 404].includes(response.status)) {
          // Expired viewer links must not retain the last authorized snapshot.
          setState(null);
          recentBidRef.current = null;
          lastSuccess.current = 0;
        }
        setError(auctionStateError(response.status, body?.code));
        setStale(true);
        failures.current += 1;
      } else {
        const snapshot = (await response.json()) as AuctionStateResponse;
        // A Realtime bid can arrive while an older snapshot is in flight.
        // Never allow that outdated response to briefly replace the new leader.
        const freshBid = recentBidRef.current;
        if (
          requestSequenceRef.current !== requestSequence &&
          freshBid &&
          snapshot.current?.id === freshBid.auction_player_id &&
          (!snapshot.highestBid || snapshot.highestBid.amount < freshBid.amount)
        ) {
          snapshot.highestBid = {
            id: freshBid.id,
            team_id: freshBid.team_id,
            amount: freshBid.amount,
            created_at: freshBid.created_at,
          };
          needsRefreshRef.current = true;
        }
        if (requestGeneration !== generation.current) return;
        setState(snapshot);
        setError(null);
        failures.current = 0;
        lastSuccess.current = Date.now();
        setStale(false);
      }
    } catch {
      if (requestGeneration === generation.current) {
        failures.current += 1;
        setError(auctionStateError(0));
        setStale(true);
      }
    } finally {
      clearTimeout(timeout);
      if (requestGeneration !== generation.current) return;
      inFlightRef.current = false;
      setLoading(false);
      if (needsRefreshRef.current) {
        needsRefreshRef.current = false;
        // A change during a request must never be discarded.
        void refresh();
      }
    }
  }, [auctionId, viewerToken]);

  useEffect(() => {
    generation.current += 1;
    inFlightRef.current = false;
    needsRefreshRef.current = false;
    lastSuccess.current = 0;
    failures.current = 0;
    recentBidRef.current = null;
    setState(null);
    setError(null);
    setStale(true);
    setLoading(true);
    setConnected(false);
    void refresh();
    const cleanup = () => {
      generation.current += 1;
      controller.current?.abort();
    };
    // Bearer-link spectators use the authorized snapshot endpoint. Anonymous
    // table subscriptions would bypass link expiry/revocation.
    if (viewerToken) return cleanup;
    const supabase = createClient();
    const channel = supabase
      .channel(`auction-${auctionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `auction_id=eq.${auctionId}`,
        },
        (event) => {
          const bid = event.new as BidUpdate;
          applyBid(bid);
          // Direct payload is instant; a later full snapshot confirms totals.
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bids",
          filter: `auction_id=eq.${auctionId}`,
        },
        () => {
          recentBidRef.current = null;
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auction_players",
          filter: `auction_id=eq.${auctionId}`,
        },
        () => {
          recentBidRef.current = null;
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auctions",
          filter: `id=eq.${auctionId}`,
        },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "purse_ledger",
          filter: `auction_id=eq.${auctionId}`,
        },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_players",
          filter: `auction_id=eq.${auctionId}`,
        },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
          filter: `auction_id=eq.${auctionId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          void refresh();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setConnected(false);
        }
      });

    return () => {
      cleanup();
      void supabase.removeChannel(channel);
    };
  }, [auctionId, viewerToken, applyBid, refresh]);

  // Spread audience requests and back off failures instead of accelerating load
  // during an outage. Hidden tabs make no requests.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const schedule = () => {
      const base = viewerToken
        ? Math.max(pollMs, 2500)
        : connected
          ? Math.max(pollMs, 5000)
          : Math.max(pollMs, 1500);
      const delay = Math.min(15000, base * 2 ** Math.min(failures.current, 3));
      timer = setTimeout(
        async () => {
          await refresh();
          if (!stopped) schedule();
        },
        delay * (0.9 + Math.random() * 0.2),
      );
    };
    schedule();
    const freshness = setInterval(
      () =>
        setStale(
          failures.current > 0 || Date.now() - lastSuccess.current > 10000,
        ),
      1000,
    );
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(freshness);
    };
  }, [pollMs, connected, refresh, viewerToken]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [refresh]);

  return {
    state,
    error,
    loading,
    refresh,
    applyBid,
    stale,
    realtimeConnected: connected,
  };
}
