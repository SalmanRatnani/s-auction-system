import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-9 w-full rounded-lg bg-[var(--bg-1)] border border-[var(--line-1)] px-3 text-sm text-[var(--fg-1)]",
      "transition-colors duration-150",
      "hover:border-[var(--line-2)]",
      "focus:outline-none focus:border-[var(--accent-line)]",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";