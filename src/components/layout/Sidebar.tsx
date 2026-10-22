"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/branding/Logo";
import { NAV } from "./navigation";
import type { Role } from "@/types/roles";

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <aside className="app-sidebar hidden md:flex flex-col">
      <div className="sidebar-brand">
        <Logo />
      </div>
      <div className="mx-6 border-b border-[var(--line-2)] pb-5 text-[10px] tracking-widest text-[var(--fg-3)]">
        YOUR AUCTION WORKSPACE
      </div>
      <nav
        aria-label="Workspace navigation"
        className="flex-1 overflow-y-auto pb-3"
      >
        <span className="sidebar-section-label">Arena</span>
        {(NAV[role] ?? NAV.VIEWER).map((item, index) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <div key={item.href}>
              {role === "MAIN_CONTROLLER" && index === 3 && (
                <span className="sidebar-section-label">Management</span>
              )}
              <Link
                href={item.href}
                className="sidebar-link"
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} strokeWidth={1.7} />
                <span className="flex-1">{item.label}</span>
                {active && <ArrowUpRight size={13} />}
              </Link>
            </div>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <ShieldCheck size={18} className="mb-2 text-[var(--accent)]" />
        <strong className="text-[var(--fg-2)] font-medium">
          A role for every player.
        </strong>
        <br />
        Access tailored to your team.
      </div>
    </aside>
  );
}
