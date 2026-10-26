"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/branding/Logo";
import { ThemePicker } from "@/components/theme/ThemePicker";

const links = [
  { id: "experience", label: "Experience" },
  { id: "how-it-works", label: "How it works" },
  { id: "roles", label: "For your team" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const header = useRef<HTMLElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const ratio =
        height > 0 ? Math.max(0, Math.min(1, window.scrollY / height)) : 0;
      if (progress.current)
        progress.current.style.transform = `scaleX(${ratio})`;
      if (header.current)
        header.current.dataset.scrolled = String(window.scrollY > 12);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const resize =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null;
    resize?.observe(header.current?.parentElement ?? document.body);
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries)
                if (entry.isIntersecting) setActive(entry.target.id);
            },
            { rootMargin: "-15% 0px -65% 0px" },
          )
        : null;
    for (const { id } of links) {
      const section = document.getElementById(id);
      if (section) observer?.observe(section);
    }
    const hero = document.querySelector(".hero-grid");
    if (hero) observer?.observe(hero);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resize?.disconnect();
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !header.current?.contains(event.target)
      )
        setOpen(false);
    };
    const wide = window.matchMedia("(min-width: 768px)");
    const onResize = () => {
      if (wide.matches) setOpen(false);
    };
    document.addEventListener("pointerdown", onOutside);
    wide.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      wide.removeEventListener("change", onResize);
    };
  }, [open]);

  return (
    <header
      ref={header}
      className="marketing-header"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <div className="marketing-container marketing-nav">
        <Logo href="/" />
        <nav className="marketing-desktop-nav" aria-label="Main navigation">
          {links.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={active === id ? "location" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="marketing-header-actions">
          <ThemePicker />
          <Link href="/login" className="marketing-signin" aria-label="Sign in">
            <span>Sign in</span>
            <ArrowUpRight size={17} />
          </Link>
          <button
            ref={menuButton}
            type="button"
            className="marketing-menu-toggle"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="marketing-mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      <nav
        id="marketing-mobile-nav"
        className="marketing-mobile-nav"
        aria-label="Mobile navigation"
        hidden={!open}
      >
        {links.map(({ id, label }, index) => (
          <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>
            <small>0{index + 1}</small>
            {label}
            <ArrowUpRight size={17} />
          </a>
        ))}
        <Link href="/demo" onClick={() => setOpen(false)}>
          <small>04</small>Explore the demo
          <ArrowUpRight size={17} />
        </Link>
      </nav>
      <span ref={progress} className="reading-progress" aria-hidden="true" />
    </header>
  );
}
