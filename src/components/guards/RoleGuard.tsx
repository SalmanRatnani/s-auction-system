import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/types/roles";

export async function RoleGuard({
  allow,
  children,
  fallback = "/dashboard",
}: {
  allow: Role[];
  children: React.ReactNode;
  fallback?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = (user.app_metadata?.role ?? "VIEWER") as Role;
  if (!allow.includes(role)) redirect(fallback);

  return <>{children}</>;
}