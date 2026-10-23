"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { ArenaPoster } from "./ArenaPoster";
import type { ArenaSceneController } from "./arena-scene";

export function ArenaScene() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<ArenaSceneController | null>(null);
  const pausedRef = useRef(false);
  const sync = useRef<() => void>(() => {});
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const element = host.current;
    const surface = canvas.current;
    if (!element || !surface) return;
    let cancelled = false;
    let loading = false;
    let failed = false;
    let visible = false;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    setReduced(preference.matches);
    const update = () =>
      controller.current?.setRunning(
        visible &&
          !document.hidden &&
          !pausedRef.current &&
          !preference.matches,
      );
    sync.current = update;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      controller.current?.resize(width, height);
    };
    const fail = () => {
      failed = true;
      surface.removeEventListener("webglcontextlost", fail);
      controller.current?.dispose();
      controller.current = null;
      if (!cancelled) setReady(false);
    };
    const load = async () => {
      if (loading || failed || cancelled) return;
      loading = true;
      try {
        // This is the only runtime import of Three.js; the rest of the site stays light.
        const { createArenaScene } = await import("./arena-scene");
        if (cancelled) return;
        controller.current = createArenaScene(surface);
        resize();
        setReady(true);
        update();
      } catch {
        fail();
      }
    };
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting;
              if (visible) void load();
              update();
            },
            { threshold: 0 },
          )
        : null;
    if (observer) observer.observe(element);
    else {
      visible = true;
      void load();
    }
    const sizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    sizeObserver?.observe(element);
    if (!sizeObserver) window.addEventListener("resize", resize);
    const onPreference = () => {
      setReduced(preference.matches);
      update();
    };
    const onMove = (event: PointerEvent) => {
      if (
        !finePointer.matches ||
        preference.matches ||
        pausedRef.current ||
        event.pointerType !== "mouse"
      )
        return;
      const rect = element.getBoundingClientRect();
      controller.current?.setPointer(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ((event.clientY - rect.top) / rect.height) * 2 - 1,
      );
    };
    const onLeave = () => controller.current?.setPointer(0, 0);
    preference.addEventListener("change", onPreference);
    document.addEventListener("visibilitychange", update);
    surface.addEventListener("webglcontextlost", fail);
    element.addEventListener("pointermove", onMove, { passive: true });
    element.addEventListener("pointerleave", onLeave);
    return () => {
      cancelled = true;
      observer?.disconnect();
      sizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      preference.removeEventListener("change", onPreference);
      document.removeEventListener("visibilitychange", update);
      surface.removeEventListener("webglcontextlost", fail);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
      controller.current?.dispose();
      controller.current = null;
      sync.current = () => {};
    };
  }, []);

  return (
    <figure
      className="arena-scene"
      aria-label="A badminton racket and feathered shuttle floating above a miniature court"
    >
      <div className="arena-scene-label" aria-hidden="true">
        <span /> THE GAME, IN A NEW DIMENSION.
      </div>
      <div
        ref={host}
        className="arena-scene-viewport"
        data-ready={ready}
        aria-hidden="true"
      >
        <div className="arena-scene-poster">
          <ArenaPoster />
        </div>
        <canvas ref={canvas} className="arena-scene-canvas" />
      </div>
      {ready && !reduced && (
        <button
          type="button"
          className="scene-motion-toggle"
          aria-label={paused ? "Play 3D animation" : "Pause 3D animation"}
          onClick={() => {
            pausedRef.current = !pausedRef.current;
            setPaused(pausedRef.current);
            sync.current();
          }}
        >
          {paused ? (
            <Play size={13} aria-hidden="true" />
          ) : (
            <Pause size={13} aria-hidden="true" />
          )}
          <span>{paused ? "Play" : "Pause"}</span>
        </button>
      )}
    </figure>
  );
}
