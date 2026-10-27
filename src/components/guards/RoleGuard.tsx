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

  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (error || !profile) redirect("/login");
  const role = profile.role as Role;
  if (!allow.includes(role)) {
    redirect(ROLE_HOME[role] ?? "/dashboard");
  }

  return <>{children}</>;
}
