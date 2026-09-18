// src/constants/categories.ts

export const PURSE_PAISE = 1_00_00_000_00; // ₹1 Cr
export const PURSE_LABEL = "₹1,00,00,000 (1 Cr)";

export const CATEGORY_ORDER = [
  "A+",
  "A1", "A2", "A3",
  "B1", "B2", "B3", "B4", "B5",
  "C1", "C2", "C3", "C4",
  "K1", "K2",
  "W1", "W2",
  "G1",
] as const;

export type Category = (typeof CATEGORY_ORDER)[number];

/** Base prices in paise. Final values. */
export const DEFAULT_BASE_PRICES: Record<Category, number> = {
  "A+": 3_00_000_00, // ₹3,00,000
  A1:   2_00_000_00,
  A2:   1_50_000_00,
  A3:   1_50_000_00,
  B1:   1_00_000_00,
  B2:   1_00_000_00,
  B3:   75_000_00,
  B4:   75_000_00,
  B5:   50_000_00,
  C1:   30_000_00,
  C2:   30_000_00,
  C3:   15_000_00,
  C4:   15_000_00,
  K1:   25_000_00,
  K2:   25_000_00,
  W1:   1_00_000_00,
  W2:   50_000_00,
  G1:   10_000_00,
};

/** Per-category bid increment in paise. */
export const DEFAULT_INCREMENTS: Record<Category, number> = {
  "A+": 25_000_00,
  A1:   20_000_00,
  A2:   15_000_00,
  A3:   15_000_00,
  B1:   10_000_00,
  B2:   10_000_00,
  B3:   10_000_00,
  B4:   10_000_00,
  B5:   5_000_00,
  C1:   5_000_00,
  C2:   5_000_00,
  C3:   2_500_00,
  C4:   2_500_00,
  K1:   2_500_00,
  K2:   2_500_00,
  W1:   10_000_00,
  W2:   5_000_00,
  G1:   1_000_00,
};

export const PLAYERS_PER_CATEGORY = 6;
export const TOTAL_PLAYERS = CATEGORY_ORDER.length * PLAYERS_PER_CATEGORY; // 108

export const TOTAL_TEAMS = 6;
export const SQUAD_SIZE = 18;
export const INITIAL_PURSE_PAISE = 1_00_00_000_00; // ₹1 Cr
export const DEFAULT_INCREMENT_PAISE = 5_000_00;    // fallback only

/** Human-friendly category groupings. */
export const CATEGORY_BLOCKS: { label: string; categories: Category[] }[] = [
  { label: "A Block", categories: ["A+", "A1", "A2", "A3"] },
  { label: "B Block", categories: ["B1", "B2", "B3", "B4", "B5"] },
  { label: "C Block", categories: ["C1", "C2", "C3", "C4"] },
  { label: "K Block", categories: ["K1", "K2"] },
  { label: "W Block", categories: ["W1", "W2"] },
  { label: "G Block", categories: ["G1"] },
];

export type CategoryTone =
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

export const CATEGORY_TONES: Record<Category, CategoryTone> = {
  "A+": "accent",
  A1: "accent",
  A2: "accent",
  A3: "accent",
  B1: "info",
  B2: "info",
  B3: "info",
  B4: "info",
  B5: "info",
  C1: "success",
  C2: "success",
  C3: "success",
  C4: "success",
  K1: "warning",
  K2: "warning",
  W1: "danger",
  W2: "danger",
  G1: "neutral",
};

export function toneForGrade(grade: string): CategoryTone {
  return CATEGORY_TONES[grade as Category] ?? "neutral";
}

/** Base price for a grade, preferring the auction config over the default. */
export function getBasePrice(
  config: Record<string, unknown> | null | undefined,
  grade: string
): number {
  const fallback = DEFAULT_BASE_PRICES[grade as Category] ?? 0;
  if (!config) return fallback;
  const basePrices = (config as { basePrices?: Record<string, number> })
    .basePrices;
  if (!basePrices) return fallback;
  const value = basePrices[grade];
  return typeof value === "number" && value > 0 ? value : fallback;
}

/** Bid increment for a grade, preferring config over the default. */
export function getIncrement(
  config: Record<string, unknown> | null | undefined,
  grade: string
): number {
  const fallback = DEFAULT_INCREMENTS[grade as Category] ?? DEFAULT_INCREMENT_PAISE;
  if (!config) return fallback;
  const increments = (config as { increments?: Record<string, number> })
    .increments;
  if (!increments) return fallback;
  const value = increments[grade];
  return typeof value === "number" && value > 0 ? value : fallback;
}