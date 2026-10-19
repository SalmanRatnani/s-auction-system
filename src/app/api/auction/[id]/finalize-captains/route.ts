import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_BASE_PRICES } from "@/constants/categories";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await client.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "MAIN_CONTROLLER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await client.rpc("finalize_playing_captains", {
    p_auction_id: id,
    p_default_base_prices: DEFAULT_BASE_PRICES,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true, result: data });
}
