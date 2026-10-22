import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrCreateDraftAuction } from "@/lib/auction";
import { formatINR } from "@/lib/utils";
import { PurseTopup } from "./PurseTopup";

export const dynamic = "force-dynamic";

export default async function PursePage() {
  return (
    <RoleGuard allow={["MAIN_CONTROLLER"]}>
      <Inner />
    </RoleGuard>
  );
}

async function Inner() {
  const supabase = await createClient();
  const auction = await getOrCreateDraftAuction();
  if (!auction) return <div className="text-[var(--danger)]">No auction.</div>;

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, logo_url, initial_purse, captain_user_id")
    .eq("auction_id", auction.id)
    .order("created_at", { ascending: true });

  const { data: purses } = await supabase
    .from("team_purses")
    .select("team_id, remaining_purse, spent, squad_count")
    .eq("auction_id", auction.id);

  const purseMap: Record<
    string,
    { remaining_purse: number; spent: number; squad_count: number }
  > = {};
  (purses ?? []).forEach((p) => {
    purseMap[p.team_id] = {
      remaining_purse: Number(p.remaining_purse ?? 0),
      spent: Number(p.spent ?? 0),
      squad_count: Number(p.squad_count ?? 0),
    };
  });

  const { data: ledger } = await supabase
    .from("purse_ledger")
    .select("id, team_id, delta, reason, created_at")
    .eq("auction_id", auction.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const teamName = (id: string) =>
    teams?.find((t) => t.id === id)?.name ?? "—";

  return (
    <div className="space-y-6 max-w-5xl animate-fade-up">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">
          Purse Manager
        </h1>
        <p className="text-[13px] text-[var(--fg-3)] mt-1">
          Team purses are virtual auction credits (not real money). Top up
          captains or correct balances when needed.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {(teams ?? []).map((t) => {
          const p = purseMap[t.id];
          const remaining = p?.remaining_purse ?? t.initial_purse;
          const spent = p?.spent ?? 0;
          return (
            <Card key={t.id}>
              <CardBody className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  {t.logo_url ? (
                    <img
                      src={t.logo_url}
                      alt=""
                      className="h-9 w-9 rounded-md object-cover border border-[var(--line-1)]"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-md bg-[var(--bg-2)] border border-[var(--line-1)] grid place-items-center text-[10px] font-mono text-[var(--fg-4)]">
                      {t.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[var(--fg-1)] truncate">
                      {t.name}
                    </div>
                    <div className="text-[11px] text-[var(--fg-4)] tnum">
                      {p?.squad_count ?? 0} players
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-md border border-[var(--accent-line)] bg-[var(--accent-bg)] p-2">
                    <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--accent)]">
                      Remaining
                    </div>
                    <div className="text-[13px] font-semibold text-[var(--accent)] tnum mt-0.5">
                      {formatINR(remaining, { compact: true })}
                    </div>
                  </div>
                  <div className="rounded-md border border-[var(--line-1)] bg-[var(--bg-0)] p-2">
                    <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
                      Spent
                    </div>
                    <div className="text-[13px] font-semibold text-[var(--fg-1)] tnum mt-0.5">
                      {formatINR(spent, { compact: true })}
                    </div>
                  </div>
                </div>
                <PurseTopup teamId={t.id} teamName={t.name} />
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent purse activity</CardTitle>
        </CardHeader>
        <CardBody>
          {!ledger || ledger.length === 0 ? (
            <p className="text-[13px] text-[var(--fg-4)] py-2">
              No entries yet.
            </p>
          ) : (
            <div className="space-y-0.5">
              {ledger.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-3 py-1.5 border-b border-[var(--line-1)] last:border-0 text-[12px]"
                >
                  <span
                    className={`font-mono tnum w-20 ${
                      l.delta > 0
                        ? "text-[var(--success)]"
                        : "text-[var(--danger)]"
                    }`}
                  >
                    {l.delta > 0 ? "+" : ""}
                    {formatINR(l.delta, { compact: true })}
                  </span>
                  <span className="flex-1 truncate text-[var(--fg-1)]">
                    {teamName(l.team_id)}
                  </span>
                  <span className="text-[10px] text-[var(--fg-4)] uppercase tracking-wider">
                    {l.reason}
                  </span>
                  <span className="text-[10px] text-[var(--fg-4)] tnum">
                    {new Date(l.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}