import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { getOrCreateDraftAuction } from "@/lib/auction";
import { BidClient } from "./BidClient";

export const dynamic = "force-dynamic";

export default async function CaptainBidPage() {
  return (
    <RoleGuard allow={["CAPTAIN", "MAIN_CONTROLLER", "AUCTIONEER", "VIEWER"]}>
      <Inner />
    </RoleGuard>
  );
}

async function Inner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const auction = await getOrCreateDraftAuction();
  if (!auction) return <div className="text-red-300">No auction.</div>;

  return <BidClient auctionId={auction.id} userId={user.id} />;
}