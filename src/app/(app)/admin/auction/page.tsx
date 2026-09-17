import Link from "next/link";
import { Gavel } from "lucide-react";
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
  if (!auction) return <div className="text-[var(--danger)]">No auction.</div>;

  return (
    <div className="space-y-6 max-w-5xl animate-fade-up">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Auction Control
          </h1>
          <p className="text-[13px] text-[var(--fg-3)] mt-1">
            <span className="text-[var(--fg-1)]">{auction.name}</span> · Status:{" "}
            <span className="text-[var(--fg-2)]">{auction.status}</span> · Mode:{" "}
            <span className="text-[var(--fg-2)]">{auction.mode}</span>
          </p>
        </div>
        <Link
          href="/auctioneer/console"
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
        >
          <Gavel size={13} strokeWidth={2} />
          Open console
        </Link>
      </header>

      <AuctionControls auction={auction} />

      <Card>
        <CardBody className="text-[13px] text-[var(--fg-3)] p-4">
          Once live, the auctioneer console becomes active. Config can no longer
          be edited while the auction is live.
        </CardBody>
      </Card>

      <AuctionConfig auction={auction} />
    </div>
  );
}