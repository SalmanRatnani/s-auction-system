import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlayerProfileData } from "@/components/auction/PlayerProfile";

export async function loadPlayerProfile(
  supabase: SupabaseClient,
  playerId: string
): Promise<PlayerProfileData | null> {
  // Public player fields only. No phone, no DOB, no age proof.
  const { data: p } = await supabase
    .from("players")
    .select(
      "id, player_code, name, age, grade, image_url, playing_centre, playing_hand, achievements"
    )
    .eq("id", playerId)
    .maybeSingle();

  if (!p) return null;

  // Sale info (if this player was sold)
  const { data: tp } = await supabase
    .from("team_players")
    .select("team_id, price, teams:teams (name)")
    .eq("player_id", playerId)
    .maybeSingle();

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