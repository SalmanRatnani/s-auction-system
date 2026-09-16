// src/constants/categories.ts
/** Team purse: ₹1,00,00,000 (1 crore) expressed in paise. */
export const PURSE_PAISE = 1_000_000_000; // 1 crore rupees = 1,000,000,000 paise

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

export const TOTAL_PLAYERS =
  CATEGORY_ORDER.length * PLAYERS_PER_CATEGORY; // 18 × 6 = 108

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

/** Tailwind color classes per block, for badges. */
export const CATEGORY_COLORS: Record<Category, string> = {
  "A+": "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  A1:   "bg-amber-500/15 text-amber-300 border-amber-500/30",
  A2:   "bg-orange-500/15 text-orange-300 border-orange-500/30",
  A3:   "bg-orange-500/10 text-orange-200 border-orange-500/20",
  B1:   "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  B2:   "bg-emerald-500/10 text-emerald-200 border-emerald-500/20",
  B3:   "bg-teal-500/15 text-teal-300 border-teal-500/30",
  B4:   "bg-teal-500/10 text-teal-200 border-teal-500/20",
  B5:   "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  C1:   "bg-sky-500/15 text-sky-300 border-sky-500/30",
  C2:   "bg-sky-500/10 text-sky-200 border-sky-500/20",
  C3:   "bg-blue-500/15 text-blue-300 border-blue-500/30",
  C4:   "bg-blue-500/10 text-blue-200 border-blue-500/20",
  K1:   "bg-violet-500/15 text-violet-300 border-violet-500/30",
  K2:   "bg-violet-500/10 text-violet-200 border-violet-500/20",
  W1:   "bg-pink-500/15 text-pink-300 border-pink-500/30",
  W2:   "bg-pink-500/10 text-pink-200 border-pink-500/20",
  G1:   "bg-slate-500/15 text-slate-300 border-slate-500/30",
};