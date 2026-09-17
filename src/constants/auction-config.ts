// src/constants/auction-config.ts

export const DEFAULT_CONFIG = {
  maxSquad: 18,
  initialPurse: 10_00_00_000, // ₹1 Cr in paise
  increment: 5_000_00,        // ₹5,000 in paise
  timer: { enabled: false, seconds: 30, autoSellOnExpiry: true },
  reserveGuard: false,
  showPurseToCaptains: true,
  showPurseToViewers: false,
  showPoolCounts: true,
  viewerMode: "PUBLIC_LINK" as const,
};

export type AuctionConfig = typeof DEFAULT_CONFIG;