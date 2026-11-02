import { NextResponse, type NextRequest } from "next/server";
import { validateViewerToken } from "@/lib/security/viewer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectAuctionSnapshot, type Snapshot } from "@/lib/auction-snapshot";
import { UUID } from "@/lib/auction-command";
import {
  AUCTION_SETUP_MESSAGE,
  isAuctionSetupError,
} from "@/lib/auction-availability";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID.test(id))
    return NextResponse.json({ error: "Invalid auction ID" }, { status: 400 });
  const token = request.nextUrl.searchParams.get("viewerToken");
  let role = "";
  let userId: string | null = null;
  if (token !== null) {
    // Bearer-link viewers must remain VIEWER even when they have auth cookies.
    // Avoid an Auth getUser() call and a role lookup on every spectator poll.
    // Validate on EVERY request so revoked/expired links stop immediately.
    if (!(await validateViewerToken(token, id)))
      return NextResponse.json(
        { error: "Viewer access expired or sign-in required" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    role = "VIEWER";
  } else {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (user) {
      const { data: profile, error: roleError } = await client
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!roleError) role = profile?.role ?? "";
      userId = user.id;
    }
    if (!role)
      return NextResponse.json(
        { error: "Viewer access expired or sign-in required" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
  }
  const { data, error } = await createAdminClient().rpc("auction_snapshot", {
    p_auction_id: id,
  });
  if (error) {
    const requestId = crypto.randomUUID();
    console.error("auction_snapshot_failed", {
      requestId,
      auctionId: id,
      code: error.code,
    });
    return NextResponse.json(
      {
        error: isAuctionSetupError(error)
          ? AUCTION_SETUP_MESSAGE
          : "Auction state is temporarily unavailable",
        code: isAuctionSetupError(error)
          ? "AUCTION_SETUP_REQUIRED"
          : "AUCTION_UNAVAILABLE",
        requestId,
      },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store", "Retry-After": "15" },
      },
    );
  }
  if (!data?.auction)
    return NextResponse.json({ error: "Auction not found" }, { status: 404 });
  try {
    return NextResponse.json(
      projectAuctionSnapshot(
        data as Snapshot,
        role || "VIEWER",
        userId,
      ),
      {
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Incomplete auction state. Please refresh." },
      { status: 503 },
    );
  }
}
