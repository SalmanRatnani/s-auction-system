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

const TONE_MAP: Record<
  string,
  "accent" | "success" | "warning" | "danger" | "info" | "neutral"
> = {
  BID_PLACED: "success",
  PLAYER_SOLD: "success",
  PLAYER_UNSOLD: "warning",
  BID_UNDONE: "danger",
  PLAYER_DRAWN: "info",
  PLAYER_DELETED: "danger",
  PURSE_TOPUP: "accent",
  GRADE_CHANGED: "warning",
  REGISTRATION_APPROVED: "success",
  REGISTRATION_REJECTED: "danger",
  REGISTRATION_REVOKED: "danger",
  ROLE_CHANGED: "accent",
  DISPLAY_NAME_CHANGED: "info",
  AUCTION_STARTED: "success",
  AUCTION_ENDED: "neutral",
  AUCTION_PAUSED: "warning",
  AUCTION_RESUMED: "success",
  AUCTION_RESET: "danger",
  ROUND2_STARTED: "info",
  TEAM_CREATED: "info",
  TEAM_UPDATED: "info",
  TEAM_DELETED: "danger",
};

async function Inner() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("audit_log")
    .select("id, actor_user_id, action, entity_type, entity_id, created_at")
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

  return (
    <div className="space-y-6 max-w-5xl animate-fade-up">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Audit Log</h1>
        <p className="text-[13px] text-[var(--fg-3)] mt-1">
          Every bid, sale, grade change, and controller action. Last 200 entries.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardBody>
          {!logs || logs.length === 0 ? (
            <p className="text-[13px] text-[var(--fg-4)] py-2">
              No events yet.
            </p>
          ) : (
            <div className="space-y-0.5">
              {logs.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-3 py-2 border-b border-[var(--line-1)] last:border-0 text-[12px]"
                >
                  <Badge tone={TONE_MAP[l.action] ?? "neutral"}>
                    {l.action.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                  <span className="text-[var(--fg-2)] flex-1 truncate">
                    {userLabel(l.actor_user_id)}
                  </span>
                  <span className="text-[10px] text-[var(--fg-4)] font-mono hidden md:inline">
                    {l.entity_type}/{String(l.entity_id ?? "").slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-[var(--fg-4)] tnum whitespace-nowrap">
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