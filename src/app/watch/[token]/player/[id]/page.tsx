import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlayerProfile } from "@/components/auction/PlayerProfile";
import { loadPlayerProfile } from "@/lib/players";

export const dynamic = "force-dynamic";

export default async function WatchPlayerPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;

  const admin = createAdminClient();

  // Validate token
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
          <h1 className="text-[22px] font-semibold">Link expired</h1>
          <p className="text-[13px] text-[var(--fg-3)]">
            Ask the auctioneer for a new link.
          </p>
        </div>
      </div>
    );
  }

  const player = await loadPlayerProfile(admin, id);
  if (!player) notFound();

  return (
    <main className="min-h-screen p-4 md:p-8">
      <PlayerProfile
        player={player}
        backHref={`/watch/${token}`}
      />
    </main>
  );
}