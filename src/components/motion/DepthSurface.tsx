"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** A small pointer-driven tilt. Touch, focus and reduced motion stay stationary. */
export function DepthSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = host.current;
    const card = surface.current;
    if (!node || !card) return;
    return attachDepthMotion(node, card);
  }, []);
  return (
    <div ref={host} className={`depth-surface ${className}`}>
      <div ref={surface} className="depth-surface-card">
        {children}
      </div>
    </div>
  );
}

export function attachDepthMotion(host: HTMLElement, card: HTMLElement) {
  const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let x = 0;
  let y = 0;
  let bounds: DOMRect | null = null;
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    bounds = null;
    card.style.removeProperty("--depth-x");
    card.style.removeProperty("--depth-y");
  };
  const move = (event: PointerEvent) => {
    if (
      !pointer.matches ||
      motion.matches ||
      document.hidden ||
      event.pointerType !== "mouse" ||
      host.contains(document.activeElement)
    )
      return;
    bounds ??= host.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    x = Math.max(
      -1,
      Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1),
    );
    y = Math.max(
      -1,
      Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1),
    );
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      card.style.setProperty("--depth-x", `${(-y * 3).toFixed(2)}deg`);
      card.style.setProperty("--depth-y", `${(x * 3).toFixed(2)}deg`);
    });
  };
  host.addEventListener("pointermove", move, { passive: true });
  host.addEventListener("pointerleave", reset);
  host.addEventListener("pointerdown", reset);
  host.addEventListener("focusin", reset);
  window.addEventListener("scroll", reset, { passive: true, capture: true });
  window.addEventListener("resize", reset);
  document.addEventListener("visibilitychange", reset);
  pointer.addEventListener("change", reset);
  motion.addEventListener("change", reset);
  return () => {
    reset();
    host.removeEventListener("pointermove", move);
    host.removeEventListener("pointerleave", reset);
    host.removeEventListener("pointerdown", reset);
    host.removeEventListener("focusin", reset);
    window.removeEventListener("scroll", reset, true);
    window.removeEventListener("resize", reset);
    document.removeEventListener("visibilitychange", reset);
    pointer.removeEventListener("change", reset);
    motion.removeEventListener("change", reset);
  };
}
