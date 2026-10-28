"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CATEGORY_ORDER,
  DEFAULT_BASE_PRICES,
  DEFAULT_INCREMENTS,
  type Category,
} from "@/constants/categories";

type Auction = {
  id: string;
  name: string;
  mode: string;
  status: string;
  config: Record<string, unknown>;
};

type Config = {
  basePrices: Record<Category, number>;
  increments: Record<Category, number>;
  initialPurse: number;
  increment: { mode: "FIXED" | "TIERED"; value: number };
  timer: { enabled: boolean; seconds: number; autoSellOnExpiry: boolean };
  reserveGuard: boolean;
  showPurseToCaptains: boolean;
  showPurseToViewers: boolean;
  showPoolCounts: boolean;
  viewerMode: "PUBLIC_LINK" | "LOGIN_REQUIRED";
  maxSquad: number;
};

const DEFAULT_CONFIG: Config = {
  basePrices: { ...DEFAULT_BASE_PRICES },
  increments: { ...DEFAULT_INCREMENTS },
  initialPurse: 1_00_00_000_00,
  increment: { mode: "FIXED", value: 5_000_00 },
  timer: { enabled: false, seconds: 30, autoSellOnExpiry: false },
  reserveGuard: true,
  showPurseToCaptains: true,
  showPurseToViewers: false,
  showPoolCounts: true,
  viewerMode: "PUBLIC_LINK",
  maxSquad: 18,
};

export function AuctionConfig({ auction }: { auction: Auction }) {
  const router = useRouter();

  // Merge defaults with stored config, ensuring basePrices/increments
  // always have every category even if the DB has an older partial map.
  const stored = (auction.config ?? {}) as Partial<Config>;
  const initial: Config = {
    ...DEFAULT_CONFIG,
    ...stored,
    basePrices: { ...DEFAULT_BASE_PRICES, ...(stored.basePrices ?? {}) },
    increments: { ...DEFAULT_INCREMENTS, ...(stored.increments ?? {}) },
    increment: { ...DEFAULT_CONFIG.increment, ...(stored.increment ?? {}) },
    timer: {
      ...DEFAULT_CONFIG.timer,
      ...(stored.timer ?? {}),
      enabled: false,
      autoSellOnExpiry: false,
    },
    reserveGuard: true,
  };

  const [config, setConfig] = useState<Config>(initial);
  const [name, setName] = useState(auction.name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [openPrices, setOpenPrices] = useState(false);

  const isLocked = auction.status !== "DRAFT";

  function update<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function updateBasePrice(cat: Category, paise: number) {
    setConfig((c) => ({
      ...c,
      basePrices: { ...c.basePrices, [cat]: paise },
    }));
  }

  function updateIncrement(cat: Category, paise: number) {
    setConfig((c) => ({
      ...c,
      increments: { ...c.increments, [cat]: paise },
    }));
  }

  function loadDefaults() {
    if (
      !window.confirm(
        "Reset all base prices and increments to the defaults?\n\n" +
          "This will overwrite any custom values you've entered for this auction.",
      )
    )
      return;
    setConfig((c) => ({
      ...c,
      basePrices: { ...DEFAULT_BASE_PRICES },
      increments: { ...DEFAULT_INCREMENTS },
    }));
    setMsg({
      kind: "ok",
      text: "Defaults loaded. Click Save config to persist.",
    });
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/auction/${auction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, config, mode: auction.mode }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ kind: "err", text: body.error ?? "Failed" });
      return;
    }
    setMsg({ kind: "ok", text: "Saved." });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        {/* Auction name + initial purse */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Auction name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLocked}
            />
          </Field>
          <Field
            label="Initial purse (₹)"
            hint={`Currently ₹${(config.initialPurse / 100).toLocaleString("en-IN")}`}
          >
            <Input
              type="number"
              value={config.initialPurse / 100}
              onChange={(e) =>
                update(
                  "initialPurse",
                  Math.max(0, Number(e.target.value) * 100),
                )
              }
              disabled={isLocked}
            />
          </Field>
        </div>

        {/* Max squad + timer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Max squad size">
            <Input
              type="number"
              value={config.maxSquad}
              onChange={(e) => update("maxSquad", Number(e.target.value) || 18)}
              disabled={isLocked}
            />
          </Field>
        </div>

        <p className="text-xs text-[var(--fg-3)]">
          Sales are confirmed manually. Playing-captain purse reserves are
          always protected.
        </p>
        {/* Toggles */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          <Toggle
            label="Other teams’ purses to captains"
            checked={config.showPurseToCaptains}
            onChange={(v) => update("showPurseToCaptains", v)}
            disabled={isLocked}
          />
          <Toggle
            label="Purse to viewers"
            checked={config.showPurseToViewers}
            onChange={(v) => update("showPurseToViewers", v)}
            disabled={isLocked}
          />
          <Toggle
            label="Show pool counts"
            checked={config.showPoolCounts}
            onChange={(v) => update("showPoolCounts", v)}
            disabled={isLocked}
          />
        </div>

        {/* Base prices + increments per category */}
        <div className="border-t border-[var(--line-1)] pt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpenPrices((v) => !v)}
              className="flex items-center gap-1.5 text-[13px] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              {openPrices ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {openPrices ? "Hide" : "Show"} base prices &amp; increments
            </button>
            {openPrices && (
              <button
                type="button"
                onClick={loadDefaults}
                disabled={isLocked}
                className="inline-flex items-center gap-1 text-[12px] text-[var(--fg-3)] hover:text-[var(--fg-1)] transition-colors disabled:opacity-40"
              >
                <RotateCcw size={11} strokeWidth={2} />
                Load defaults
              </button>
            )}
          </div>

          {openPrices && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
              {CATEGORY_ORDER.map((c) => (
                <div key={c} className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-3)] font-medium">
                    {c}
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[var(--fg-4)] mb-0.5">
                      Base
                    </label>
                    <Input
                      type="number"
                      value={config.basePrices[c] / 100}
                      onChange={(e) =>
                        updateBasePrice(
                          c,
                          Math.max(0, Number(e.target.value) * 100),
                        )
                      }
                      disabled={isLocked}
                      className="h-8 text-[12px] tnum"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[var(--fg-4)] mb-0.5">
                      Incr
                    </label>
                    <Input
                      type="number"
                      value={config.increments[c] / 100}
                      onChange={(e) =>
                        updateIncrement(
                          c,
                          Math.max(0, Number(e.target.value) * 100),
                        )
                      }
                      disabled={isLocked}
                      className="h-8 text-[12px] tnum"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-3 border-t border-[var(--line-1)]">
          <Button onClick={save} loading={busy} disabled={isLocked} size="sm">
            Save config
          </Button>
          {isLocked && (
            <span className="text-[12px] text-[var(--fg-4)]">
              Locked while auction is {auction.status.toLowerCase()}.
            </span>
          )}
        </div>

        {msg && (
          <div
            className={`text-[13px] rounded-lg p-3 border ${
              msg.kind === "err"
                ? "border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger)]"
                : "border-[var(--success-line)] bg-[var(--success-bg)] text-[var(--success)]"
            }`}
          >
            {msg.text}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] uppercase tracking-[0.08em] text-[var(--fg-4)]">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-[var(--fg-4)]">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none text-[12px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-3.5 w-3.5 accent-[var(--accent)] disabled:opacity-40"
      />
      <span className="text-[var(--fg-2)]">{label}</span>
    </label>
  );
}
