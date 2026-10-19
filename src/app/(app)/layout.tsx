import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { PageTransition } from "@/components/layout/PageTransition";
import { AutoLogout } from "@/components/layout/AutoLogout";
import type { Role } from "@/types/roles";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, role, email")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "VIEWER") as Role;
  const displayName = profile?.display_name ?? user.email ?? "User";
  const email = profile?.email ?? user.email ?? "";

  return (
    <div className="min-h-screen flex">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar role={role} displayName={displayName} email={email} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto"><PageTransition>{children}</PageTransition></main>
      </div>
      <AutoLogout role={role} />
    </div>
  );
}