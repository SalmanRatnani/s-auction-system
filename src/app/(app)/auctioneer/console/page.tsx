import { RoleGuard } from "@/components/guards/RoleGuard";
import { getOrCreateDraftAuction } from "@/lib/auction";
import { ConsoleClient } from "./ConsoleClient";

export const dynamic = "force-dynamic";

export default async function ConsolePage() {
  return (
    <RoleGuard allow={["MAIN_CONTROLLER", "AUCTIONEER"]}>
      <Inner />
    </RoleGuard>
  );
}

async function Inner() {
  const auction = await getOrCreateDraftAuction();
  if (!auction) return <div className="text-red-300">No auction.</div>;

  return <ConsoleClient auctionId={auction.id} />;
}