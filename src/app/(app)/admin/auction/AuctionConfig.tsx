"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_ORDER, DEFAULT_BASE_PRICES, type Category } from "@/constants/categories";

type Auction = {
  id: string;
  name: string;
  mode: string;
  status: string;
  config: Record<string, unknown>;
};

type Config = {
  basePrices: Record<Category, number>;
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
  initialPurse: 1_00_00_000_00, // ₹1 Cr in paise
  increment: { mode: "FIXED", value: 5_000_00 },
  timer: { enabled: false, seconds: 30, autoSellOnExpiry: true },
  reserveGuard: false,
  showPurseToCaptains: true,
  showPurseToViewers: true,
  showPoolCounts: true,
  viewerMode: "PUBLIC_LINK",
  maxSquad: 18,
};

export function AuctionConfig({ auction }: { auction: Auction }) {
  const router = useRouter();
  const initial = { ...DEFAULT_CONFIG, ...(auction.config as Partial<Config>) };
  const [config, setConfig] = useState<Config>(initial);
  const [name, setName] = useState(auction.name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [openPrices, setOpenPrices] = useState(false);

  const isLocked = auction.status === "LIVE" || auction.status === "PAUSED";

  function update<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function updateBasePrice(cat: Category, paise: number) {
    setConfig((c) => ({
      ...c,
      basePrices: { ...c.basePrices, [cat]: paise },
    }));
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">Auction name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Initial purse (₹)</label>
            <Input
              type="number"
              value={config.initialPurse / 100}
              onChange={(e) =>
                update("initialPurse", Math.max(0, Number(e.target.value) * 100))
              }
              disabled={isLocked}
            />
            <p className="text-[10px] text-white/40 mt-1">
              Currently ₹{(config.initialPurse / 100).toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">Bid increment (₹)</label>
            <Input
              type="number"
              value={config.increment.value / 100}
              onChange={(e) =>
                update("increment", {
                  ...config.increment,
                  value: Math.max(100, Number(e.target.value) * 100),
                })
              }
              disabled={isLocked}
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Max squad size</label>
            <Input
              type="number"
              value={config.maxSquad}
              onChange={(e) => update("maxSquad", Number(e.target.value) || 18)}
              disabled={isLocked}
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Timer (seconds)</label>
            <Input
              type="number"
              value={config.timer.seconds}
              onChange={(e) =>
                update("timer", {
                  ...config.timer,
                  seconds: Math.max(5, Number(e.target.value) || 30),
                })
              }
              disabled={isLocked || !config.timer.enabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <Toggle
            label="Timer enabled"
            checked={config.timer.enabled}
            onChange={(v) => update("timer", { ...config.timer, enabled: v })}
            disabled={isLocked}
          />
          <Toggle
            label="Auto-sell on expiry"
            checked={config.timer.autoSellOnExpiry}
            onChange={(v) => update("timer", { ...config.timer, autoSellOnExpiry: v })}
            disabled={isLocked || !config.timer.enabled}
          />
          <Toggle
            label="Reserve guard"
            checked={config.reserveGuard}
            onChange={(v) => update("reserveGuard", v)}
            disabled={isLocked}
          />
          <Toggle
            label="Show purse to captains"
            checked={config.showPurseToCaptains}
            onChange={(v) => update("showPurseToCaptains", v)}
            disabled={isLocked}
          />
          <Toggle
            label="Show purse to viewers"
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

        <div>
          <button
            type="button"
            onClick={() => setOpenPrices((v) => !v)}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            {openPrices ? "Hide" : "Show"} base prices per category
          </button>
          {openPrices && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-3">
              {CATEGORY_ORDER.map((c) => (
                <div key={c}>
                  <label className="block text-[10px] text-white/50 mb-0.5">{c}</label>
                  <Input
                    type="number"
                    value={config.basePrices[c] / 100}
                    onChange={(e) =>
                      updateBasePrice(c, Math.max(0, Number(e.target.value) * 100))
                    }
                    disabled={isLocked}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-white/5">
          <Button onClick={save} loading={busy} disabled={isLocked}>
            Save config
          </Button>
          {isLocked && (
            <span className="text-xs text-white/40">
              Locked while auction is {auction.status.toLowerCase()}.
            </span>
          )}
        </div>

        {msg && (
          <div
            className={`text-sm rounded-lg p-3 border ${
              msg.kind === "err"
                ? "bg-red-500/10 border-red-500/30 text-red-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            {msg.text}
          </div>
        )}
      </CardBody>
    </Card>
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
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 accent-emerald-500"
      />
      <span className="text-white/70">{label}</span>
    </label>
  );
}