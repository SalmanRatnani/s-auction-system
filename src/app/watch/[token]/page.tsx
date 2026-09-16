import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { LiveViewer } from "@/components/auction/LiveViewer";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("viewer_links")
    .select("id, auction_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!link) notFound();

  if (new Date(link.expires_at) < new Date()) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold">Link expired</h1>
          <p className="text-white/60 text-sm">
            This spectator link has expired. Ask the auctioneer for a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <LiveViewer auctionId={link.auction_id} showPurse={true} />
    </main>
  );
}