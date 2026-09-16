import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-white placeholder:text-white/40",
        "focus:outline-none focus:border-emerald-400/60 focus:bg-white/10 transition-colors",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";