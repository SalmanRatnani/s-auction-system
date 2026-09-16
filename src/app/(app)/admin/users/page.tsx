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
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-3xl font-bold">Users & Roles</h1>
        <p className="text-white/50 text-sm mt-1">
          {users?.length ?? 0} users. Role changes take effect on the user's next sign-in.
        </p>
      </header>

      <Card>
        <CardBody className="p-0">
          <div className="divide-y divide-white/5">
            {(users ?? []).map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {u.display_name ?? u.email}
                  </div>
                  <div className="text-xs text-white/50 truncate">{u.email}</div>
                </div>
                <RoleBadge role={u.role as Role} />
                <UserRoleChanger userId={u.id} currentRole={u.role as Role} />
              </div>
            ))}
            {(users ?? []).length === 0 && (
              <div className="p-6 text-sm text-white/40">No users yet.</div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}