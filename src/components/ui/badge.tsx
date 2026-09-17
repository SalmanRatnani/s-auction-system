import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-[var(--bg-2)] text-[var(--fg-2)] border-[var(--line-2)]",
  accent:  "bg-[var(--accent-bg)] text-[var(--accent)] border-[var(--accent-line)]",
  success: "bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-line)]",
  warning: "bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-line)]",
  danger:  "bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger-line)]",
  info:    "bg-[var(--info-bg)] text-[var(--info)] border-[var(--info-line)]",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium tnum",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}