"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function PageTransition({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = container.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!node?.animate || preference.matches) return;
    // Preserve child state and focus; no delayed navigation or replay on live updates.
    const animation = node.animate(
      [
        { opacity: 0.72, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 260, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
    const stop = () => animation.cancel();
    preference.addEventListener("change", stop);
    node.addEventListener("focusin", stop);
    return () => {
      stop();
      preference.removeEventListener("change", stop);
      node.removeEventListener("focusin", stop);
    };
  }, [pathname]);
  return (
    <div ref={container} className={className}>
      {children}
    </div>
  );
}
