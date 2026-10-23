"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/branding/Logo";
import { RoleBadge } from "./RoleBadge";
import { NAV } from "./navigation";
import type { Role } from "@/types/roles";

export function MobileNav({
  role,
  displayName,
}: {
  role: Role;
  displayName: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (media.matches) dialog.current?.close();
    };
    media.addEventListener("change", closeOnDesktop);
    return () => {
      media.removeEventListener("change", closeOnDesktop);
      document.body.style.overflow = "";
    };
  }, []);
  function close() {
    dialog.current?.close();
  }
  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => {
          dialog.current?.showModal();
          document.body.style.overflow = "hidden";
        }}
        className="md:hidden grid h-11 w-11 place-items-center rounded-lg border border-[var(--line-2)]"
        aria-label="Open navigation"
        aria-haspopup="dialog"
      >
        <Menu size={20} />
      </button>
      <dialog
        ref={dialog}
        aria-label="Workspace navigation"
        className="drawer-dialog"
        onClose={() => {
          document.body.style.overflow = "";
          trigger.current?.focus();
        }}
        onClick={(e) => {
          if (
            e.target === dialog.current &&
            e.clientX > dialog.current.getBoundingClientRect().right
          )
            close();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-5 border-b border-[var(--line-2)]">
            <Logo />
            <button
              autoFocus
              onClick={close}
              className="grid h-11 w-11 place-items-center rounded-lg"
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          </div>
          <div className="px-6 py-5 border-b border-[var(--line-2)]">
            <p className="text-sm mb-2 truncate">{displayName}</p>
            <RoleBadge role={role} />
          </div>
          <nav
            className="flex-1 overflow-y-auto py-4"
            aria-label="Mobile workspace navigation"
          >
            {(NAV[role] ?? NAV.VIEWER).map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={close}
                className="sidebar-link"
                aria-current={
                  pathname === href || pathname.startsWith(href + "/")
                    ? "page"
                    : undefined
                }
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </dialog>
    </>
  );
}
