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
import type { Role } from "@/types/roles";
import type { LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV: Record<Role, NavItem[]> = {
  MAIN_CONTROLLER: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/auctioneer/console", label: "Auction Console", icon: Gavel },
    { href: "/projector", label: "Projector", icon: Monitor },
    { href: "/admin/teams", label: "Teams", icon: Users },
    {
      href: "/admin/registrations",
      label: "Registrations",
      icon: ClipboardList,
    },
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
