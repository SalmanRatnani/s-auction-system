import { createClient } from "@/lib/supabase/server";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Card, CardBody } from "@/components/ui/card";
import { RoleBadge } from "@/components/layout/RoleBadge";
import { UserRoleChanger } from "./UserRoleChanger";
import type { Role } from "@/types/roles";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  return (
    <RoleGuard allow={["MAIN_CONTROLLER"]}>
      <Inner />
    </RoleGuard>
  );
}

async function Inner() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("users")
    .select("id, email, display_name, role, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6 max-w-4xl animate-fade-up">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">
          Users &amp; Roles
        </h1>
        <p className="text-[13px] text-[var(--fg-3)] mt-1">
          <span className="tnum">{users?.length ?? 0}</span> users. Role changes
          take effect on the user&apos;s next sign-in.
        </p>
      </header>

      <Card>
        <CardBody className="p-0">
          <div className="divide-y divide-[var(--line-1)]">
            {(users ?? []).map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[var(--fg-1)] truncate">
                    {u.display_name ?? u.email}
                  </div>
                  <div className="text-[11px] text-[var(--fg-4)] truncate">
                    {u.email}
                  </div>
                </div>
                <RoleBadge role={u.role as Role} />
                <UserRoleChanger
                  userId={u.id}
                  currentRole={u.role as Role}
                  currentEmail={u.email}
                />
              </div>
            ))}
            {(users ?? []).length === 0 && (
              <div className="p-6 text-[13px] text-[var(--fg-4)]">
                No users yet.
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}