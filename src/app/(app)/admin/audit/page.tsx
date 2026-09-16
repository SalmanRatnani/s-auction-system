import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  return (
    <RoleGuard allow={["MAIN_CONTROLLER"]}>
      <Inner />
    </RoleGuard>
  );
}

async function Inner() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("audit_log")
    .select("id, actor_user_id, action, entity_type, entity_id, payload, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: users } = await supabase
    .from("users")
    .select("id, email, display_name");

  const userLabel = (id: string | null) => {
    if (!id) return "system";
    const u = users?.find((x) => x.id === id);
    return u ? u.display_name ?? u.email : id.slice(0, 8);
  };

  const TONE: Record<string, string> = {
    BID_PLACED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    PLAYER_SOLD: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
    PLAYER_UNSOLD: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    BID_UNDONE: "bg-red-500/15 text-red-300 border-red-500/30",
    PLAYER_DRAWN: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    PLAYER_DELETED: "bg-red-500/20 text-red-200 border-red-400/40",
    PURSE_TOPUP: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    GRADE_CHANGED: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    REGISTRATION_APPROVED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    REGISTRATION_REJECTED: "bg-red-500/15 text-red-300 border-red-500/30",
    REGISTRATION_REVOKED: "bg-red-500/15 text-red-300 border-red-500/30",
    ROLE_CHANGED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    AUCTION_STARTED: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
    AUCTION_ENDED: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    AUCTION_PAUSED: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    AUCTION_RESUMED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    AUCTION_RESET: "bg-red-500/20 text-red-200 border-red-400/40",
    ROUND2_STARTED: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    TEAM_CREATED: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    TEAM_UPDATED: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    TEAM_DELETED: "bg-red-500/15 text-red-300 border-red-500/30",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <p className="text-white/50 text-sm mt-1">
          Every bid, sale, grade change, and controller action. Last 200 entries.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardBody>
          {!logs || logs.length === 0 ? (
            <p className="text-sm text-white/40">No events yet.</p>
          ) : (
            <div className="space-y-1">
              {logs.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 text-sm"
                >
                  <Badge
                    className={
                      TONE[l.action] ??
                      "bg-white/5 text-white/70 border-white/10"
                    }
                  >
                    {l.action.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-white/80 flex-1 truncate">
                    {userLabel(l.actor_user_id)}
                  </span>
                  <span className="text-[10px] text-white/40 font-mono hidden md:inline">
                    {l.entity_type}/{String(l.entity_id ?? "").slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-white/40 whitespace-nowrap">
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