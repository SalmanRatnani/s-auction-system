"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/branding/Logo";
import type { Role } from "@/types/roles";

type NavItem = { href: string; label: string; icon: string };

const NAV: Record<Role, NavItem[]> = {
  MAIN_CONTROLLER: [
    { href: "/dashboard", label: "Dashboard", icon: "🏸" },
    { href: "/auctioneer/console", label: "Auction Console", icon: "🎙️" },
    { href: "/projector", label: "Projector", icon: "📽️" },
    { href: "/admin/teams", label: "Teams", icon: "👥" },
    { href: "/admin/registrations", label: "Registrations", icon: "📝" },
    { href: "/admin/grading", label: "Grading", icon: "⭐" },
    { href: "/admin/auction", label: "Auction Control", icon: "🎯" },
    { href: "/admin/purse", label: "Purse Manager", icon: "💰" },
    { href: "/admin/users", label: "Users & Roles", icon: "🔑" },
    { href: "/admin/viewer-links", label: "Viewer Links", icon: "🔗" },
    { href: "/admin/audit", label: "Audit Log", icon: "📋" },
    { href: "/admin/exports", label: "Exports", icon: "📤" },
  ],
  AUCTIONEER: [
    { href: "/auctioneer/console", label: "Auction Console", icon: "🎙️" },
    { href: "/captain/teams", label: "All Teams", icon: "👥" },
    { href: "/dashboard", label: "Dashboard", icon: "🏸" },
  ],
  CAPTAIN: [
    { href: "/captain/bid", label: "Bid", icon: "⚡" },
    { href: "/captain/my-team", label: "My Team", icon: "🛡️" },
    { href: "/captain/teams", label: "All Teams", icon: "👥" },
    { href: "/viewer/live", label: "Live", icon: "📺" },
    { href: "/dashboard", label: "Dashboard", icon: "🏸" },
  ],
  VIEWER: [
    { href: "/viewer/live", label: "Live Auction", icon: "📺" },
    { href: "/captain/teams", label: "All Teams", icon: "👥" },
    { href: "/dashboard", label: "Dashboard", icon: "🏸" },
  ],
};

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV[role] ?? NAV.VIEWER;

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="p-6">
        <Logo />
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-emerald-500/15 text-emerald-300 font-medium"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-[10px] text-white/30 text-center">
        S Auction System · v0.1
      </div>
    </aside>
  );
}