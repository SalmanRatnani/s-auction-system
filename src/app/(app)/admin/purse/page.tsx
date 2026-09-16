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
  if (!auction) return <div className="text-red-300">No auction.</div>;

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, logo_url, initial_purse, captain_user_id")
    .eq("auction_id", auction.id)
    .order("created_at", { ascending: true });

  const { data: purses } = await supabase
    .from("team_purses")
    .select("team_id, remaining_purse, spent, squad_count")
    .eq("auction_id", auction.id);

  const purseMap: Record<string, { remaining_purse: number; spent: number; squad_count: number }> = {};
  (purses ?? []).forEach((p) => {
    purseMap[p.team_id] = {
      remaining_purse: Number(p.remaining_purse ?? 0),
      spent: Number(p.spent ?? 0),
      squad_count: Number(p.squad_count ?? 0),
    };
  });

  // Recent ledger entries
  const { data: ledger } = await supabase
    .from("purse_ledger")
    .select("id, team_id, delta, reason, created_at")
    .eq("auction_id", auction.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const teamName = (id: string) =>
    teams?.find((t) => t.id === id)?.name ?? "—";

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h1 className="text-3xl font-bold">Purse Manager</h1>
        <p className="text-white/50 text-sm mt-1">
          Top up captains who are running out of purse, or refund after a mistake.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(teams ?? []).map((t) => {
          const p = purseMap[t.id];
          const remaining = p?.remaining_purse ?? t.initial_purse;
          const spent = p?.spent ?? 0;
          return (
            <Card key={t.id}>
              <CardBody className="space-y-3">
                <div className="flex items-center gap-3">
                  {t.logo_url ? (
                    <img
                      src={t.logo_url}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-white/5 grid place-items-center">
                      🏸
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="text-xs text-white/50">
                      {p?.squad_count ?? 0} players
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2">
                    <div className="text-[10px] text-emerald-300/70 uppercase">
                      Remaining
                    </div>
                    <div className="text-sm font-bold text-emerald-300">
                      {formatINR(remaining, { compact: true })}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-2">
                    <div className="text-[10px] text-white/40 uppercase">
                      Spent
                    </div>
                    <div className="text-sm font-bold text-white/90">
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
            <p className="text-sm text-white/40">No entries yet.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {ledger.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-3 py-1 border-b border-white/5 last:border-0"
                >
                  <span
                    className={`font-mono text-xs w-24 ${
                      l.delta > 0 ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {l.delta > 0 ? "+" : ""}
                    {formatINR(l.delta, { compact: true })}
                  </span>
                  <span className="flex-1 truncate">{teamName(l.team_id)}</span>
                  <span className="text-xs text-white/40">{l.reason}</span>
                  <span className="text-[10px] text-white/40">
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