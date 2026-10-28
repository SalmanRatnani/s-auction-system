"use client";

import { ThemePicker } from "@/components/theme/ThemePicker";
import { RoleBadge } from "@/components/layout/RoleBadge";
import { SoundToggle } from "@/components/layout/SoundToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { MobileNav } from "@/components/layout/MobileNav";
import { QuickNavigation } from "./QuickNavigation";
import { usePathname } from "next/navigation";
import { NAV } from "./navigation";
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
  const pathname = usePathname();
  const page =
    (NAV[role] ?? NAV.VIEWER).find(
      (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
    )?.label ?? "Workspace";
  return (
    <header className="app-topbar">
      <div className="flex items-center gap-2">
        <MobileNav role={role} displayName={displayName} />
        <div className="hidden sm:block mr-4">
          <span className="text-[10px] text-[var(--fg-4)] block mb-1">
            WORKSPACE /
          </span>
          <span className="text-[13px] font-medium">{page}</span>
        </div>
        <span className="app-topbar-role">
          <RoleBadge role={role} />
        </span>
      </div>
      <div className="flex items-center gap-2">
        <QuickNavigation
          items={(NAV[role] ?? NAV.VIEWER).map((item) => ({
            ...item,
            id: item.href,
          }))}
        />
        <ThemePicker />
        <SoundToggle />
        <UserMenu role={role} displayName={displayName} email={email} />
      </div>
    </header>
  );
}
