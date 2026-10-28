import { CATEGORY_ORDER } from "@/constants/categories";
const allowed = new Set([
  "basePrices",
  "increments",
  "initialPurse",
  "increment",
  "timer",
  "reserveGuard",
  "showPurseToCaptains",
  "showPurseToViewers",
  "showPoolCounts",
  "viewerMode",
  "maxSquad",
]);
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const amount = (v: unknown) =>
  Number.isSafeInteger(v) && Number(v) > 0 && Number(v) <= 100_000_000_000;
export function validateAuctionConfig(value: unknown): string | null {
  if (!object(value)) return "Configuration must be an object";
  for (const [key, v] of Object.entries(value)) {
    if (!allowed.has(key)) return `Unknown setting: ${key}`;
    if (
      key === "maxSquad" &&
      (!Number.isInteger(v) || Number(v) < 1 || Number(v) > 100)
    )
      return "Squad size must be 1–100";
    if (key === "initialPurse" && !amount(v))
      return "Starting purse must be a positive integer in paise";
    if (
      [
        "showPurseToCaptains",
        "showPurseToViewers",
        "showPoolCounts",
        "reserveGuard",
      ].includes(key) &&
      typeof v !== "boolean"
    )
      return `${key} must be true or false`;
    if (
      key === "viewerMode" &&
      !["PUBLIC_LINK", "LOGIN_REQUIRED"].includes(String(v))
    )
      return "Invalid viewer access mode";
    if (key === "basePrices" || key === "increments") {
      if (!object(v)) return `${key} must contain category amounts`;
      for (const [grade, n] of Object.entries(v))
        if (
          !(CATEGORY_ORDER as readonly string[]).includes(grade) ||
          !amount(n)
        )
          return `Invalid amount for ${grade}`;
    }
    if (
      key === "timer" &&
      (!object(v) ||
        v.enabled !== false ||
        v.autoSellOnExpiry !== false ||
        !Number.isInteger(v.seconds) ||
        Number(v.seconds) < 5 ||
        Number(v.seconds) > 600)
    )
      return "Automatic timers are unavailable. Confirm each sale manually.";
    if (
      key === "increment" &&
      !(
        amount(v) ||
        (object(v) &&
          ["FIXED", "TIERED"].includes(String(v.mode)) &&
          amount(v.value))
      )
    )
      return "Invalid legacy increment";
  }
  return null;
}
