import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody } from "@/components/ui/card";
import { getOrCreateDraftAuction } from "@/lib/auction";
import { CreateTeamButton } from "./CreateTeamButton";
import { TeamCard } from "./TeamCard";

export const dynamic = "force-dynamic";

const MAX_TEAMS = 6;

export default async function TeamsPage() {
  return (
    <RoleGuard allow={["MAIN_CONTROLLER"]}>
      <Inner />
    </RoleGuard>
  );
}

async function Inner() {
  const supabase = await createClient();
  const auction = await getOrCreateDraftAuction();
  if (!auction) {
    return <div className="text-red-300">Failed to init auction.</div>;
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, logo_url, captain_user_id, initial_purse, created_at")
    .eq("auction_id", auction.id)
    .order("created_at", { ascending: true });

  const { data: users } = await supabase
    .from("users")
    .select("id, email, display_name, role")
    .order("display_name", { ascending: true });

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-white/50 text-sm mt-1">
            Auction: <span className="text-white/80">{auction.name}</span> ·{" "}
            {teams?.length ?? 0} / {MAX_TEAMS} teams
          </p>
        </div>
        <CreateTeamButton disabled={(teams?.length ?? 0) >= MAX_TEAMS} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(teams ?? []).map((t) => (
          <TeamCard key={t.id} team={t} users={users ?? []} />
        ))}
        {(teams ?? []).length === 0 && (
          <Card className="col-span-full">
            <CardBody className="text-sm text-white/50">
              No teams yet. Click "Create team" to start.
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}