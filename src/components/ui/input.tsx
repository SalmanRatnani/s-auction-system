import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-lg bg-[var(--bg-1)] border border-[var(--line-1)] px-3 text-sm text-[var(--fg-1)]",
        "placeholder:text-[var(--fg-4)]",
        "transition-colors duration-150",
        "hover:border-[var(--line-2)]",
        "focus:outline-none focus:border-[var(--accent-line)] focus:bg-[var(--bg-2)]",
        "focus:shadow-[0_0_0_3px_rgba(228,183,92,0.08)]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";