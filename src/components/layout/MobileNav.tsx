"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, Gavel, Monitor, Users, ClipboardList, Star, Target, Wallet, UserCog, Link2, History, Download, Zap, Shield, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/branding/Logo";
import { RoleBadge } from "@/components/layout/RoleBadge";
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

export function MobileNav({
  role,
  displayName,
}: {
  role: Role;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = NAV[role] ?? NAV.VIEWER;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden grid h-9 w-9 place-items-center rounded-md border border-[var(--line-1)] bg-[var(--bg-1)] text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:border-[var(--line-2)] transition-colors"
        aria-label="Open menu"
      >
        <Menu size={16} strokeWidth={1.75} />
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-[150] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <aside className="relative w-[280px] max-w-[85vw] h-full bg-[var(--bg-0)] border-r border-[var(--line-1)] flex flex-col animate-slide-right">
            <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--line-1)]">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--bg-2)] transition-colors"
                aria-label="Close menu"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-[var(--line-1)]">
              <div className="text-[13px] font-medium text-[var(--fg-1)] truncate">
                {displayName}
              </div>
              <div className="mt-1">
                <RoleBadge role={role} />
              </div>
            </div>

            <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors duration-100",
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
        </div>
      )}
    </>
  );
}