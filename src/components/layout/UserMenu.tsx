"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Pencil, LayoutDashboard, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RoleBadge } from "@/components/layout/RoleBadge";
import type { Role } from "@/types/roles";
import { ChangeNameDialog } from "@/components/layout/ChangeNameDialog";

export function UserMenu({
  role,
  displayName,
  email,
}: {
  role: Role;
  displayName: string;
  email: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const canRename =
    role === "MAIN_CONTROLLER" || role === "AUCTIONEER" || role === "CAPTAIN";

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const menu = open ? (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: coords.top,
        right: coords.right,
        zIndex: 9999,
      }}
      className="w-[240px] rounded-lg border border-[var(--line-2)] bg-[var(--bg-1)] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] animate-fade-down overflow-hidden"
    >
      {/* User info header */}
      <div className="px-3 py-2.5 border-b border-[var(--line-1)]">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[var(--fg-1)] truncate">
            {displayName}
          </span>
          <RoleBadge role={role} />
        </div>
        <div className="text-[11px] text-[var(--fg-4)] truncate mt-0.5">
          {email}
        </div>
      </div>

      {/* Actions */}
      <div className="py-1">
        {canRename && (
          <MenuItem
            icon={Pencil}
            label="Change display name"
            onClick={() => {
              setOpen(false);
              setShowRename(true);
            }}
          />
        )}
        <MenuItem
          icon={LayoutDashboard}
          label="Dashboard"
          onClick={() => {
            setOpen(false);
            router.push("/dashboard");
          }}
        />
      </div>

      {/* Sign out */}
      <div className="border-t border-[var(--line-1)] py-1">
        <MenuItem
          icon={LogOut}
          label="Sign out"
          onClick={signOut}
          danger
        />
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md hover:bg-[var(--bg-2)] px-2 py-1 transition-colors duration-100"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--bg-2)] border border-[var(--line-2)] text-[11px] font-semibold text-[var(--fg-1)]">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <span className="hidden sm:block text-[13px] text-[var(--fg-2)] max-w-[120px] truncate">
          {displayName}
        </span>
        <svg
          className={`h-3 w-3 text-[var(--fg-4)] transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {mounted && menu ? createPortal(menu, document.body) : null}

      {showRename && (
        <ChangeNameDialog
          currentName={displayName}
          onClose={() => setShowRename(false)}
          onSaved={() => {
            setShowRename(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors duration-100 ${
        danger
          ? "text-[var(--danger)] hover:bg-[var(--danger-bg)]"
          : "text-[var(--fg-2)] hover:bg-[var(--bg-2)] hover:text-[var(--fg-1)]"
      }`}
    >
      <Icon size={14} strokeWidth={1.75} />
      <span>{label}</span>
    </button>
  );
}