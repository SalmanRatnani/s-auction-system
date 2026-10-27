import type { NextRequest } from "next/server";
import { runAuctionCommand } from "@/lib/auction-command";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return runAuctionCommand(request, id, "skip-player");
}
