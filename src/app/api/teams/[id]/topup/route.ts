import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAuctionCommand, UUID } from "@/lib/auction-command";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID.test(id))
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await client
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "MAIN_CONTROLLER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data: team, error } = await createAdminClient()
    .from("teams")
    .select("auction_id")
    .eq("id", id)
    .single();
  if (error || !team)
    return NextResponse.json({ error: "Team unavailable" }, { status: 404 });
  return runAuctionCommand(request, team.auction_id, "topup", { teamId: id });
}
