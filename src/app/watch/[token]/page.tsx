import { validateViewerToken } from "@/lib/security/viewer";
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
          <p className="text-[var(--fg-3)] text-sm">
            Ask the auctioneer for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (!(await validateViewerToken(token, link.auction_id))) notFound();

  return (
    <main className="min-h-screen p-4 md:p-8">
      <LiveViewer
        auctionId={link.auction_id}
        viewerToken={token}
        showPurse={false}
        teamLinkBase={`/watch/${token}/team`}
      />
    </main>
  );
}
