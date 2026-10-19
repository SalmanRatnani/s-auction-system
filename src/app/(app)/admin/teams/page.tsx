import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody } from "@/components/ui/card";
import { getOrCreateDraftAuction } from "@/lib/auction";
import { CreateTeamButton } from "./CreateTeamButton";
import { TeamCard } from "./TeamCard";
import { isMissingPartnerColumn } from "@/lib/teams-compat";

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
    return <div className="text-[var(--danger)]">Failed to init auction.</div>;
  }

  // A newer app can deploy ahead of the optional co-captain migration.
  // Fall back to the original schema rather than showing zero teams.
  const fullQuery = await supabase
    .from("teams")
    .select("id, name, logo_url, captain_user_id, co_captain_user_id, captain_player_id, co_captain_player_id, initial_purse, created_at")
    .eq("auction_id", auction.id)
    .order("created_at", { ascending: true });
  const needsMigration = isMissingPartnerColumn(fullQuery.error);
  const originalQuery = needsMigration
    ? await supabase.from("teams")
        .select("id, name, logo_url, captain_user_id, captain_player_id, initial_purse, created_at")
        .eq("auction_id", auction.id)
        .order("created_at", { ascending: true })
    : null;
  const teamsError = originalQuery?.error ?? (needsMigration ? null : fullQuery.error);
  const teams = needsMigration
    ? (originalQuery?.data ?? []).map((team) => ({ ...team, co_captain_user_id: null, co_captain_player_id: null }))
    : fullQuery.data ?? [];

  const { data: users } = await supabase
    .from("users")
    .select("id, email, display_name, role")
    .order("display_name", { ascending: true });

  // Dropdown for "Playing Captain": anyone still in the pool, plus players
  // already chosen as a captain (they flip to SOLD once assigned, and would
  // otherwise vanish from their own team's dropdown).
  const assignedCaptainIds = (teams ?? [])
    .flatMap((t) => [t.captain_player_id, t.co_captain_player_id])
    .filter((v): v is string => !!v);

  let playersQuery = supabase
    .from("players")
    .select("id, name, grade, player_code")
    .order("name", { ascending: true });
  playersQuery =
    assignedCaptainIds.length > 0
      ? playersQuery.or(
          `status.eq.IN_POOL,id.in.(${assignedCaptainIds.join(",")})`
        )
      : playersQuery.eq("status", "IN_POOL");
  // Temporary QA players appear only in a rehearsal; real event dropdowns
  // exclude QA records even when they were reserved during a prior test.
  const { data: allPlayers } = await playersQuery;
  const players = (allPlayers ?? []).filter((player) =>
    assignedCaptainIds.includes(player.id) ||
    (auction.mode === "DRY_RUN"
      ? player.player_code.startsWith("QA-20261019-")
      : !player.player_code.startsWith("QA-"))
  );

  return (
    <div className="space-y-6 max-w-6xl animate-fade-up">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Team Management
          </h1>
          <p className="text-[13px] text-[var(--fg-3)] mt-1">
            <span className="text-[var(--fg-1)]">{auction.name}</span> ·{" "}
            <span className="tnum">
              {teams?.length ?? 0} / {MAX_TEAMS}
            </span>{" "}
            teams
          </p>
        </div>
        <CreateTeamButton disabled={!!teamsError || teams.length >= MAX_TEAMS} />
      </header>

      {needsMigration && (
        <div role="alert" className="rounded-lg border border-[var(--warning-line)] bg-[var(--warning-bg)] p-4 text-[13px] text-[var(--warning)]">
          The optional partner-captain database migration has not been applied yet.
          Existing teams are displayed, but adding a partner requires Supabase migration 0015.
        </div>
      )}
      {teamsError && (
        <div role="alert" className="rounded-lg border border-[var(--danger-line)] bg-[var(--danger-bg)] p-4 text-[13px] text-[var(--danger)]">
          Could not load teams: {teamsError.message}. No teams have been deleted.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {teams.map((t) => (
          <TeamCard
            key={t.id}
            team={t}
            users={users ?? []}
            players={players ?? []}
            takenPlayerIds={assignedCaptainIds.filter(
              (pid) => pid !== t.captain_player_id && pid !== t.co_captain_player_id
            )}
          />
        ))}
        {!teamsError && teams.length === 0 && (
          <Card className="col-span-full">
            <CardBody className="text-[13px] text-[var(--fg-3)] py-8 text-center">
              No teams yet. Click &quot;Create team&quot; to start.
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}