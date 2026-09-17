import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, type Role } from "@/types/roles";

export async function RoleGuard({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = (user.app_metadata?.role ?? "VIEWER") as Role;
  if (!allow.includes(role)) {
    redirect(ROLE_HOME[role] ?? "/dashboard");
  }

  return <>{children}</>;
}