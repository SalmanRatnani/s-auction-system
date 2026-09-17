"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
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

  return (
    <>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-3 rounded-lg hover:bg-white/[0.06] px-2 py-1.5 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-sm font-bold text-emerald-300">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="hidden sm:flex flex-col items-start leading-tight">
            <span className="text-sm text-white/90 font-medium max-w-[140px] truncate">
              {displayName}
            </span>
            <RoleBadge role={role} className="mt-0.5" />
          </div>
          <svg
            className={`h-3 w-3 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
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

        {open && (
          <div className="absolute right-0 top-full mt-2 w-64 z-50 rounded-xl border border-white/10 bg-[#0a1812]/95 backdrop-blur-xl shadow-2xl animate-slide-down overflow-hidden">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-white/5">
              <div className="text-xs text-white/40">Signed in as</div>
              <div className="text-sm text-white/90 font-medium truncate">
                {displayName}
              </div>
              <div className="text-[11px] text-white/40 truncate mt-0.5">
                {email}
              </div>
            </div>

            {/* Actions */}
            <div className="py-1">
              {canRename && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setShowRename(true);
                  }}
                  className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors"
                >
                  <span className="text-base">✏️</span>
                  Change display name
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/dashboard");
                }}
                className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors"
              >
                <span className="text-base">🏸</span>
                Dashboard
              </button>
            </div>

            {/* Sign out */}
            <div className="border-t border-white/5 py-1">
              <button
                type="button"
                onClick={signOut}
                className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <span className="text-base">↩</span>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

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