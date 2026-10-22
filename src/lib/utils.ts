// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format paise to ₹ with Indian comma grouping. */
export function formatINR(paise: number, opts?: { compact?: boolean }) {
  const rupees = paise / 100;
  if (opts?.compact) {
    if (rupees >= 1_00_00_000) return `₹${(rupees / 1_00_00_000).toFixed(2)} Cr`;
    if (rupees >= 1_00_000) return `₹${(rupees / 1_00_000).toFixed(2)} L`;
    if (rupees >= 1_000) return `₹${(rupees / 1_000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

/** Convert ₹ to paise. */
export function toPaise(rupees: number) {
  return Math.round(rupees * 100);
}

/** URL-safe slug. */
export function slug(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Short random token for viewer links. */
export function randomToken(len = 24) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

/** Format relative time e.g. "2m ago". */
export function timeAgo(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}