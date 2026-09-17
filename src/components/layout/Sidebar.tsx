"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Gavel,
  Monitor,
  Users,
  ClipboardList,
  Star,
  Target,
  Wallet,
  UserCog,
  Link2,
  History,
  Download,
  Zap,
  Shield,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/branding/Logo";
import type { Role } from "@/types/roles";
import type { LucideIcon } from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: Record<Role, NavItem[]> = {
  MAIN_CONTROLLER: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/auctioneer/console", label: "Auction Console", icon: Gavel },
    { href: "/projector", label: "Projector", icon: Monitor },
    { href: "/admin/teams", label: "Teams", icon: Users },
    { href: "/admin/registrations", label: "Registrations", icon: ClipboardList },
    { href: "/admin/grading", label: "Grading", icon: Star },
    { href: "/admin/auction", label: "Auction Control", icon: Target },
    { href: "/admin/purse", label: "Purse Manager", icon: Wallet },
    { href: "/admin/users", label: "Users & Roles", icon: UserCog },
    { href: "/admin/viewer-links", label: "Viewer Links", icon: Link2 },
    { href: "/admin/audit", label: "Audit Log", icon: History },
    { href: "/admin/exports", label: "Exports", icon: Download },
  ],
  AUCTIONEER: [
    { href: "/auctioneer/console", label: "Auction Console", icon: Gavel },
    { href: "/projector", label: "Projector", icon: Monitor },
    { href: "/captain/teams", label: "All Teams", icon: Users },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ],
  CAPTAIN: [
    { href: "/captain/bid", label: "Bid", icon: Zap },
    { href: "/captain/my-team", label: "My Team", icon: Shield },
    { href: "/captain/teams", label: "All Teams", icon: Users },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ],
  VIEWER: [
    { href: "/viewer/live", label: "Live Auction", icon: Radio },
    { href: "/captain/teams", label: "All Teams", icon: Users },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ],
};

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV[role] ?? NAV.VIEWER;

  return (
    <aside className="hidden md:flex w-[228px] shrink-0 flex-col border-r border-[var(--line-1)] bg-[var(--bg-0)]">
      <div className="h-14 flex items-center px-4 border-b border-[var(--line-1)]">
        <Logo />
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-100",
                active
                  ? "bg-[var(--bg-2)] text-[var(--fg-1)] font-medium"
                  : "text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--bg-1)]"
              )}
            >
              <Icon
                size={15}
                strokeWidth={1.75}
                className={active ? "text-[var(--accent)]" : ""}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-[var(--line-1)]">
        <div className="text-[10px] text-[var(--fg-4)] tracking-wide">
          S AUCTION SYSTEM
        </div>
      </div>
    </aside>
  );
}