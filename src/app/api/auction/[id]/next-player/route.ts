import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_ORDER, type Category } from "@/constants/categories";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || !["MAIN_CONTROLLER", "AUCTIONEER"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { category?: unknown };
  const grade = body.category;
  if (grade !== undefined && (typeof grade !== "string" ||
    (grade !== "ANY" && !CATEGORY_ORDER.includes(grade as Category)))) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  // The RPC locks the auction, closes prior categories, chooses and records
  // exactly one CURRENT player, and audits all of it in a single transaction.
  const { data, error } = await supabase.rpc("draw_next_auction_player", {
    p_auction_id: id,
    p_requested_grade: typeof grade === "string" ? grade : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json(data);
}
