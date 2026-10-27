import { NextResponse, type NextRequest } from "next/server";
import { validateViewerToken } from "@/lib/security/viewer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectAuctionSnapshot, type Snapshot } from "@/lib/auction-snapshot";
import { UUID } from "@/lib/auction-command";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID.test(id))
    return NextResponse.json({ error: "Invalid auction ID" }, { status: 400 });
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  let role = "";
  if (user) {
    const { data: profile, error } = await client
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!error) role = profile?.role ?? "";
  }
  const token = request.nextUrl.searchParams.get("viewerToken");
  if (!role && !(token && (await validateViewerToken(token, id))))
    return NextResponse.json(
      { error: "Viewer access expired or sign-in required" },
      { status: 401 },
    );
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
      { error: "Auction state is temporarily unavailable", requestId },
      { status: 503 },
    );
  }
  if (!data?.auction)
    return NextResponse.json({ error: "Auction not found" }, { status: 404 });
  try {
    return NextResponse.json(
      projectAuctionSnapshot(
        data as Snapshot,
        role || "VIEWER",
        user?.id ?? null,
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
