// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Middleware — auth-only.
 *
 * Role enforcement happens in two places:
 *   1. Page-level  → <RoleGuard allow={[...]}>  (server component)
 *   2. API routes  → explicit profile.role check inside the handler
 *
 * Middleware does NOT check roles because:
 *   - JWT role metadata is stale until the user signs out/in after a role change
 *   - API routes are excluded from middleware entirely (see matcher below)
 */

/** Public page paths (no auth). */
const PUBLIC_PATHS = ["/", "/login", "/verify", "/error"];

/** Public path prefixes (no auth). */
const PUBLIC_PREFIXES = [
  "/watch", // public spectator token link
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes pass straight through
  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return (await updateSession(request)).supabaseResponse;
  }

  const { supabaseResponse, user } = await updateSession(request);

  // Not authenticated → go to /login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated → let the page decide. RoleGuard enforces roles per page.
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *   - /api/*          (route handlers do their own auth)
     *   - /_next/static   (build assets)
     *   - /_next/image    (image optimization)
     *   - /favicon.ico
     *   - static files (svg, png, jpg, jpeg, gif, webp, mp3)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3)$).*)",
  ],
};