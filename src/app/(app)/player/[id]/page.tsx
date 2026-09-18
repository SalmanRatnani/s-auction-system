import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { PlayerProfile } from "@/components/auction/PlayerProfile";
import { loadPlayerProfile } from "@/lib/players";

export const dynamic = "force-dynamic";

export default async function PlayerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  return (
    <RoleGuard
      allow={["CAPTAIN", "MAIN_CONTROLLER", "AUCTIONEER", "VIEWER"]}
    >
      <Inner params={params} searchParams={searchParams} />
    </RoleGuard>
  );
}

async function Inner({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const player = await loadPlayerProfile(supabase, id);
  if (!player) notFound();

  // Choose a sensible "back" target based on the `from` query param
  const backHref = from === "teams" ? "/captain/teams" : "/dashboard";

  return <PlayerProfile player={player} backHref={backHref} />;
}