import { createClient } from "@/lib/supabase/server";
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
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  const { data: profile } = user
    ? await client.from("users").select("role").eq("id", user.id).single()
    : { data: null };
  const auction = await getOrCreateDraftAuction();
  if (!auction) return <div className="text-red-300">No auction.</div>;

  return (
    <ConsoleClient
      auctionId={auction.id}
      canSkip={profile?.role === "MAIN_CONTROLLER"}
    />
  );
}
