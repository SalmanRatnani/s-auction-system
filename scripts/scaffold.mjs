// scripts/scaffold.mjs
// Run once:  node scripts/scaffold.mjs
// Creates the entire S Auction System folder tree + .gitkeep markers.

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd(); // expects to be run from s-auction-system/

const dirs = [
  // ---- public ----
  "public",
  "public/sounds",

  // ---- supabase ----
  "supabase",
  "supabase/migrations",

  // ---- src root ----
  "src",

  // ---- app router ----
  "src/app",
  "src/app/(auth)",
  "src/app/(auth)/login",
  "src/app/(auth)/verify",
  "src/app/(auth)/error",

  "src/app/(app)",
  "src/app/(app)/dashboard",

  "src/app/(app)/admin",
  "src/app/(app)/admin/teams",
  "src/app/(app)/admin/registrations",
  "src/app/(app)/admin/registrations/[id]",
  "src/app/(app)/admin/grading",
  "src/app/(app)/admin/auction",
  "src/app/(app)/admin/purse",
  "src/app/(app)/admin/users",
  "src/app/(app)/admin/viewer-links",
  "src/app/(app)/admin/audit",
  "src/app/(app)/admin/exports",

  "src/app/(app)/auctioneer",
  "src/app/(app)/auctioneer/console",

  "src/app/(app)/captain",
  "src/app/(app)/captain/bid",
  "src/app/(app)/captain/my-team",
  "src/app/(app)/captain/teams",

  "src/app/(app)/viewer",
  "src/app/(app)/viewer/live",

  "src/app/watch",
  "src/app/watch/[token]",

  "src/app/projector",

  // ---- API routes ----
  "src/app/api",
  "src/app/api/auth",
  "src/app/api/auth/[...nextauth]",

  "src/app/api/webhook",
  "src/app/api/webhook/register",

  "src/app/api/registrations",
  "src/app/api/registrations/[id]",
  "src/app/api/registrations/[id]/approve",
  "src/app/api/registrations/[id]/reject",
  "src/app/api/registrations/[id]/proof-url",

  "src/app/api/players",
  "src/app/api/players/[id]",
  "src/app/api/players/[id]/grade",

  "src/app/api/teams",
  "src/app/api/teams/[id]",
  "src/app/api/teams/[id]/topup",

  "src/app/api/auction",
  "src/app/api/auction/[id]",
  "src/app/api/auction/[id]/config",
  "src/app/api/auction/[id]/next-player",
  "src/app/api/auction/[id]/sell",
  "src/app/api/auction/[id]/unsold",
  "src/app/api/auction/[id]/undo-bid",
  "src/app/api/auction/[id]/round2",

  "src/app/api/bids",

  "src/app/api/viewer-links",

  "src/app/api/push",
  "src/app/api/push/subscribe",

  "src/app/api/export",
  "src/app/api/export/[type]",

  // ---- components ----
  "src/components",
  "src/components/ui",
  "src/components/branding",
  "src/components/guards",
  "src/components/auction",
  "src/components/registration",
  "src/components/layout",

  // ---- lib ----
  "src/lib",
  "src/lib/supabase",
  "src/lib/validators",

  // ---- other src ----
  "src/hooks",
  "src/types",
  "src/constants",

  // ---- scripts / vscode ----
  "scripts",
  ".vscode",
];

const keep = [
  // folders that will stay empty for a while → add .gitkeep
  "public/sounds",
  "src/app/(auth)/verify",
  "src/app/(auth)/error",
  "src/app/(app)/admin/registrations/[id]",
  "src/app/(app)/admin/grading",
  "src/app/(app)/admin/auction",
  "src/app/(app)/admin/purse",
  "src/app/(app)/admin/users",
  "src/app/(app)/admin/viewer-links",
  "src/app/(app)/admin/audit",
  "src/app/(app)/admin/exports",
  "src/app/(app)/auctioneer/console",
  "src/app/(app)/captain/bid",
  "src/app/(app)/captain/my-team",
  "src/app/(app)/captain/teams",
  "src/app/(app)/viewer/live",
  "src/app/watch/[token]",
  "src/app/projector",
  "src/app/api/auth/[...nextauth]",
  "src/app/api/webhook/register",
  "src/app/api/registrations/[id]/approve",
  "src/app/api/registrations/[id]/reject",
  "src/app/api/registrations/[id]/proof-url",
  "src/app/api/players/[id]/grade",
  "src/app/api/teams/[id]/topup",
  "src/app/api/auction/[id]/config",
  "src/app/api/auction/[id]/next-player",
  "src/app/api/auction/[id]/sell",
  "src/app/api/auction/[id]/unsold",
  "src/app/api/auction/[id]/undo-bid",
  "src/app/api/auction/[id]/round2",
  "src/app/api/bids",
  "src/app/api/viewer-links",
  "src/app/api/push/subscribe",
  "src/app/api/export/[type]",
  "src/components/branding",
  "src/components/guards",
  "src/components/auction",
  "src/components/registration",
  "src/components/layout",
  "src/lib/supabase",
  "src/lib/validators",
  "src/hooks",
  "src/types",
  "src/constants",
  "scripts",
  ".vscode",
];

let created = 0;
for (const d of dirs) {
  const p = join(root, d);
  if (!existsSync(p)) {
    mkdirSync(p, { recursive: true });
    created++;
  }
}

for (const d of keep) {
  const p = join(root, d, ".gitkeep");
  if (!existsSync(p)) writeFileSync(p, "");
}

console.log(`✅ Created ${created} new folders under ${root}`);
console.log(`📄 Added .gitkeep markers to keep empty folders in Git`);
console.log(`\nNext: run "npm run dev" or start dropping in source files.`);