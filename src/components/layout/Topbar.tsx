"use client";

import { RoleBadge } from "@/components/layout/RoleBadge";
import { SoundToggle } from "@/components/layout/SoundToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { ROLE_LABELS, type Role } from "@/types/roles";

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
    <header className="h-16 flex items-center justify-between border-b border-white/[0.06] bg-black/20 backdrop-blur-xl px-4 md:px-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-white/40">{ROLE_LABELS[role]}</span>
        <span className="hidden sm:inline-flex">
          <RoleBadge role={role} />
        </span>
      </div>
      <div className="flex items-center gap-3">
        <SoundToggle />
        <UserMenu role={role} displayName={displayName} email={email} />
      </div>
    </header>
  );
}