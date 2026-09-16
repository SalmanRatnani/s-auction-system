import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { getOrCreateDraftAuction } from "@/lib/auction";
import { LiveViewer } from "@/components/auction/LiveViewer";

export const dynamic = "force-dynamic";

export default async function ViewerLivePage() {
  return (
    <RoleGuard allow={["VIEWER", "CAPTAIN", "AUCTIONEER", "MAIN_CONTROLLER"]}>
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

  return <LiveViewer auctionId={auction.id} />;
}