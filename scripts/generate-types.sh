#!/usr/bin/env bash
# Generate TypeScript types from your live Supabase schema.
# Usage (from project root):   bash scripts/generate-types.sh
set -euo pipefail

if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  echo "❌ NEXT_PUBLIC_SUPABASE_URL is not set. Source your .env.local first."
  exit 1
fi

PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's#https://([^.]+)\..*#\1#')

echo "→ Generating types for project: $PROJECT_REF"
npx supabase gen types typescript --project-id "$PROJECT_REF" --schema public > src/types/database.ts
echo "✅ Wrote src/types/database.ts"