"use client";

import { RoleBadge } from "@/components/layout/RoleBadge";
import { SoundToggle } from "@/components/layout/SoundToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { MobileNav } from "@/components/layout/MobileNav";
import type { Role } from "@/types/roles";

export function Topbar({
  role,
  displayName,
  email,
}: {
  role: Role;
  displayName: string;
  email: string;
}) {
  return (
    <header className="h-14 flex items-center justify-between border-b border-[var(--line-1)] bg-[var(--bg-0)] px-3 md:px-6">
      <div className="flex items-center gap-2">
        <MobileNav role={role} displayName={displayName} />
        <RoleBadge role={role} />
      </div>
      <div className="flex items-center gap-2">
        <SoundToggle />
        <UserMenu role={role} displayName={displayName} email={email} />
      </div>
    </header>
  );
}