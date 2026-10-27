import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_HOME, type Role } from "@/types/roles";

/** Authorize before privileged reads. Callers select only the fields their page displays. */
export async function createAuthorizedReader(allow: readonly Role[]) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error } = await client
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (error || !profile) redirect("/login");
  const role = profile.role as Role;
  if (!allow.includes(role)) redirect(ROLE_HOME[role] ?? "/dashboard");
  return createAdminClient();
}
