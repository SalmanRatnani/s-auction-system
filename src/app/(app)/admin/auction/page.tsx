import Link from "next/link";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody } from "@/components/ui/card";
import { getOrCreateDraftAuction } from "@/lib/auction";
import { AuctionConfig } from "./AuctionConfig";
import { AuctionControls } from "./AuctionControls";

export const dynamic = "force-dynamic";

export default async function AuctionPage() {
  return (
    <RoleGuard allow={["MAIN_CONTROLLER"]}>
      <Inner />
    </RoleGuard>
  );
}

async function Inner() {
  const auction = await getOrCreateDraftAuction();
  if (!auction) return <div className="text-red-300">No auction.</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Auction Control</h1>
          <p className="text-white/50 text-sm mt-1">
            {auction.name} · Status:{" "}
            <span className="text-white/80">{auction.status}</span> · Mode:{" "}
            <span className="text-white/80">{auction.mode}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/auctioneer/console"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            Open console →
          </Link>
        </div>
      </header>

      <AuctionControls auction={auction} />

      <Card>
        <CardBody className="text-sm text-white/50">
          Once LIVE, the auctioneer console becomes active. Config can no
          longer be edited while LIVE.
        </CardBody>
      </Card>

      <AuctionConfig auction={auction} />
    </div>
  );
}