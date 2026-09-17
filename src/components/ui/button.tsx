import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-ink)] font-medium hover:bg-[var(--accent-hover)]",
  secondary:
    "bg-[var(--bg-2)] text-[var(--fg-1)] border border-[var(--line-1)] hover:bg-[var(--bg-3)] hover:border-[var(--line-2)]",
  ghost:
    "bg-transparent text-[var(--fg-2)] hover:bg-[var(--bg-2)] hover:text-[var(--fg-1)]",
  outline:
    "bg-transparent border border-[var(--line-2)] text-[var(--fg-1)] hover:bg-[var(--bg-2)] hover:border-[var(--line-3)]",
  danger:
    "bg-[var(--danger)] text-white font-medium hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-md gap-1.5",
  md: "h-9 px-3.5 text-sm rounded-lg gap-2",
  lg: "h-11 px-5 text-sm rounded-lg gap-2",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors duration-150",
        "disabled:opacity-40 disabled:pointer-events-none",
        "focus:outline-none focus-visible:shadow-[0_0_0_2px_var(--bg-0),0_0_0_4px_var(--accent-line)]",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 rounded-full border-[1.5px] border-current border-t-transparent animate-spin-slow" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";