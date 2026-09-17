"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/layout/RoleBadge";
import { SoundToggle } from "@/components/layout/SoundToggle";
import { ROLE_LABELS, type Role } from "@/types/roles";

export function Topbar({
  role,
  displayName,
}: {
  role: Role;
  displayName: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-16 flex items-center justify-between border-b border-white/[0.06] bg-black/20 backdrop-blur-xl px-4 md:px-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-white/40">{ROLE_LABELS[role]}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-sm text-white/80 font-medium">{displayName}</span>
          <RoleBadge role={role} />
        </div>
        <SoundToggle />
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}