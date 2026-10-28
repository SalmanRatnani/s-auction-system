import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function manage(request: NextRequest, revoke = false) {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "MAIN_CONTROLLER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    auctionId?: string;
    hoursValid?: number;
    linkId?: string;
  };

  if (
    !body.auctionId ||
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(body.auctionId)
  ) {
    return NextResponse.json({ error: "auctionId required" }, { status: 400 });
  }

  const hours = body.hoursValid ?? 12;
  if (!Number.isInteger(hours) || hours < 1 || hours > 72)
    return NextResponse.json(
      { error: "hoursValid must be 1–72" },
      { status: 400 },
    );
  if (
    revoke &&
    !body.linkId?.match(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i)
  )
    return NextResponse.json({ error: "Link ID required" }, { status: 400 });
  const { data, error } = await userClient.rpc("manage_viewer_link", {
    p_auction_id: body.auctionId,
    p_hours: hours,
    p_link_id: revoke ? body.linkId : null,
  });
  if (error)
    return NextResponse.json(
      { error: error.code === "P0001" ? error.message : "Link update failed" },
      { status: error.code === "42501" ? 403 : 409 },
    );
  return NextResponse.json({ link: data });
}
export async function POST(request: NextRequest) {
  return manage(request);
}
export async function DELETE(request: NextRequest) {
  return manage(request, true);
}
