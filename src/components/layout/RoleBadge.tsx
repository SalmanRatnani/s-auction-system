import { cn } from "@/lib/utils";
import { ROLE_LABELS, type Role } from "@/types/roles";

const COLORS: Record<Role, string> = {
  MAIN_CONTROLLER: "text-[var(--accent)] bg-[var(--accent-bg)] border-[var(--accent-line)]",
  AUCTIONEER: "text-[#C4B5FD] bg-[rgba(196,181,253,0.10)] border-[rgba(196,181,253,0.28)]",
  CAPTAIN: "text-[var(--success)] bg-[var(--success-bg)] border-[var(--success-line)]",
  VIEWER: "text-[var(--fg-3)] bg-[var(--bg-2)] border-[var(--line-1)]",
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
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em]",
        COLORS[role],
        className
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}