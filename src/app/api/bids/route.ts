import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    auctionPlayerId?: string;
    amount?: number;
  };

  if (typeof body.auctionPlayerId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.auctionPlayerId) || !Number.isSafeInteger(body.amount) || (body.amount ?? 0) <= 0) {
    return NextResponse.json({ error: "Missing auctionPlayerId or amount" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.rpc("place_bid", {
    p_auction_player_id: body.auctionPlayerId,
    p_amount: body.amount,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, bid: data });
}