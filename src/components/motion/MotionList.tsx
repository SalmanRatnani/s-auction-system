"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

/** Keep keyed rows mounted while gently making room for new activity. */
export function MotionList({
  children,
  revision,
  className = "",
}: {
  children: ReactNode;
  revision: string;
  className?: string;
}) {
  const list = useRef<HTMLOListElement>(null);
  const positions = useRef(new Map<string, number>());
  const running = useRef(
    new Map<string, { animation: Animation; delta: number }>(),
  );

  useLayoutEffect(() => {
    const node = list.current;
    if (!node) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const next = new Map<string, number>();
    for (const row of node.querySelectorAll<HTMLElement>(
      ":scope > [data-motion-id]",
    )) {
      const id = row.dataset.motionId!;
      const top = row.offsetTop;
      const previous = positions.current.get(id);
      const pending = running.current.get(id);
      // Continue from the visible position if another event interrupts the move.
      const progress =
        pending?.animation.effect?.getComputedTiming().progress ?? 1;
      const offset = pending ? pending.delta * (1 - progress) : 0;
      pending?.animation.cancel();
      running.current.delete(id);
      next.set(id, top);
      if (
        reduce ||
        document.hidden ||
        !row.animate ||
        row.contains(document.activeElement)
      )
        continue;
      const delta = previous === undefined ? -12 : previous + offset - top;
      if (previous !== undefined && Math.abs(delta) < 0.5) continue;
      const animation = row.animate(
        [
          {
            transform: `translateY(${delta}px)`,
            opacity: previous === undefined ? 0 : 1,
          },
          { transform: "translateY(0)", opacity: 1 },
        ],
        { duration: 360, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      );
      running.current.set(id, { animation, delta });
      animation.onfinish = () => running.current.delete(id);
    }
    for (const [id, item] of running.current) {
      if (!next.has(id)) {
        item.animation.cancel();
        running.current.delete(id);
      }
    }
    positions.current = next;
  }, [revision]);

  useEffect(() => {
    const animations = running.current;
    const node = list.current;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => {
      animations.forEach(({ animation }) => animation.cancel());
      animations.clear();
    };
    media.addEventListener("change", stop);
    document.addEventListener("visibilitychange", stop);
    node?.addEventListener("focusin", stop);
    return () => {
      stop();
      media.removeEventListener("change", stop);
      document.removeEventListener("visibilitychange", stop);
      node?.removeEventListener("focusin", stop);
    };
  }, []);

  return (
    <ol ref={list} className={`motion-list ${className}`}>
      {children}
    </ol>
  );
}
