"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Content stays visible without JavaScript or observer support. */
export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [interacted, setInteracted] = useState(false);
  useEffect(() => {
    const node = root.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (
      !node ||
      preference.matches ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const running = new Map<HTMLElement, Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          observer.unobserve(target);
          if (
            preference.matches ||
            target.contains(document.activeElement) ||
            !target.animate
          )
            continue;
          const delay = Math.min(
            180,
            Math.max(0, Number(target.dataset.revealDelay) || 0),
          );
          const animation = target.animate(
            [
              { opacity: 0, transform: "translateY(18px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            {
              duration: 620,
              delay,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              fill: "backwards",
            },
          );
          running.set(target, animation);
          animation.onfinish = () => running.delete(target);
        }
      },
      { threshold: 0.08 },
    );
    // Skip content already on screen after hydration or scroll restoration.
    for (const target of node.querySelectorAll<HTMLElement>("[data-reveal]")) {
      if (target.getBoundingClientRect().top >= window.innerHeight)
        observer.observe(target);
    }
    const stop = () => {
      observer.disconnect();
      running.forEach((animation) => animation.cancel());
      running.clear();
    };
    const onPreference = () => {
      if (preference.matches) stop();
    };
    const onFocus = (event: FocusEvent) => {
      for (const [target, animation] of running) {
        if (event.target instanceof Node && target.contains(event.target)) {
          animation.cancel();
          running.delete(target);
        }
      }
    };
    preference.addEventListener("change", onPreference);
    node.addEventListener("focusin", onFocus);
    return () => {
      stop();
      preference.removeEventListener("change", onPreference);
      node.removeEventListener("focusin", onFocus);
    };
  }, []);
  return (
    <div
      ref={root}
      className={className}
      data-interacted={interacted}
      // Permanently finish hero entrances after focus, so blur cannot replay them.
      onFocusCapture={() => setInteracted(true)}
    >
      {children}
    </div>
  );
}
