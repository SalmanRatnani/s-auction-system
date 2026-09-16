import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-10 w-full rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-white",
      "focus:outline-none focus:border-emerald-400/60 focus:bg-white/10",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";