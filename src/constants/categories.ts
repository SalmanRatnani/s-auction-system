// src/constants/categories.ts

/** Team purse: ₹1,00,00,000 (1 crore) = 1,000,000,000 paise. */
export const PURSE_PAISE = 1_000_000_000;

/** Human-readable purse for UI hints. */
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

/** Base prices in paise. Editable per-auction via auctions.config.basePrices. */
export const DEFAULT_BASE_PRICES: Record<Category, number> = {
  "A+": 1_00_000_00,   // ₹1,00,000
  A1:   90_000_00,
  A2:   80_000_00,
  A3:   70_000_00,
  B1:   60_000_00,
  B2:   55_000_00,
  B3:   50_000_00,
  B4:   45_000_00,
  B5:   40_000_00,
  C1:   35_000_00,
  C2:   30_000_00,
  C3:   25_000_00,
  C4:   20_000_00,
  K1:   15_000_00,
  K2:   15_000_00,
  W1:   15_000_00,
  W2:   15_000_00,
  G1:   10_000_00,
};

export const PLAYERS_PER_CATEGORY = 6;

export const TOTAL_PLAYERS = CATEGORY_ORDER.length * PLAYERS_PER_CATEGORY; // 108

export const TOTAL_TEAMS = 6;
export const SQUAD_SIZE = 18;
export const INITIAL_PURSE_PAISE = 1_00_00_000_00; // ₹1 Cr
export const DEFAULT_INCREMENT_PAISE = 5_000_00;    // ₹5,000

/** Human-friendly category label groupings. */
export const CATEGORY_BLOCKS: { label: string; categories: Category[] }[] = [
  { label: "A Block", categories: ["A+", "A1", "A2", "A3"] },
  { label: "B Block", categories: ["B1", "B2", "B3", "B4", "B5"] },
  { label: "C Block", categories: ["C1", "C2", "C3", "C4"] },
  { label: "K Block", categories: ["K1", "K2"] },
  { label: "W Block", categories: ["W1", "W2"] },
  { label: "G Block", categories: ["G1"] },
];

/**
 * Badge tones per category. Matches the tone prop of <Badge />.
 * A-tier = gold · B-tier = blue · C-tier = green · K-tier = amber · W-tier = red · G = neutral.
 */
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

/** Convenience helper — returns a tone for any grade string. */
export function toneForGrade(grade: string): CategoryTone {
  return CATEGORY_TONES[grade as Category] ?? "neutral";
}