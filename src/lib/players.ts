import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlayerProfileData } from "@/components/auction/PlayerProfile";

export async function loadPlayerProfile(
  supabase: SupabaseClient,
  playerId: string,
  auctionId?: string,
): Promise<PlayerProfileData | null> {
  if (auctionId) {
    const { data: entry, error } = await supabase
      .from("auction_players")
      .select("id")
      .eq("auction_id", auctionId)
      .eq("player_id", playerId)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error("Player membership could not be verified");
    if (!entry) {
      const { data: roster, error: rosterError } = await supabase
        .from("team_players")
        .select("id")
        .eq("auction_id", auctionId)
        .eq("player_id", playerId)
        .limit(1)
        .maybeSingle();
      if (rosterError)
        throw new Error("Player membership could not be verified");
      if (!roster) return null;
    }
  }
  // Public player fields only. No phone, no DOB, no age proof.
  const { data: p, error: playerError } = await supabase
    .from("players")
    .select(
      "id, player_code, name, age, grade, image_url, playing_centre, playing_hand, achievements",
    )
    .eq("id", playerId)
    .maybeSingle();

  if (playerError) throw new Error("Player profile could not be loaded");
  if (!p) return null;

  // Sale info (if this player was sold)
  let saleQuery = supabase
    .from("team_players")
    .select("team_id, price, teams:teams (name)")
    .eq("player_id", playerId);
  if (auctionId) saleQuery = saleQuery.eq("auction_id", auctionId);
  const { data: tp, error: saleError } = await saleQuery
    .order("won_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (saleError) throw new Error("Player sale could not be loaded");

  let sale: PlayerProfileData["sale"] = null;
  if (tp) {
    const t = Array.isArray(tp.teams) ? tp.teams[0] : tp.teams;
    if (t) {
      sale = {
        team_id: tp.team_id,
        team_name: t.name,
        price: tp.price,
      };
    }
  }

  return {
    id: p.id,
    player_code: p.player_code,
    name: p.name,
    age: p.age,
    grade: p.grade,
    image_url: p.image_url,
    playing_centre: p.playing_centre,
    playing_hand: p.playing_hand,
    achievements: p.achievements,
    sale,
  };
}
