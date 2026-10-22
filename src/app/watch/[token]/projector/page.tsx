import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProjectorView } from "@/components/auction/ProjectorView";

export const dynamic = "force-dynamic";

export default async function WatchProjectorPage({
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
      <div className="min-h-screen grid place-items-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Link expired</h1>
          <p className="text-white/60 text-sm">Ask the auctioneer for a new link.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <ProjectorView auctionId={link.auction_id} showPurse={false} viewerToken={token} />
    </main>
  );
}