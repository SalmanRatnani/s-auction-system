import { cn } from "@/lib/utils";
import { ROLE_LABELS, type Role } from "@/types/roles";

const COLORS: Record<Role, string> = {
  MAIN_CONTROLLER: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  AUCTIONEER: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  CAPTAIN: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  VIEWER: "bg-white/10 text-white/70 border-white/20",
};

export function RoleBadge({
  role,
  className,
}: {
  role: Role;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        COLORS[role],
        className
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}