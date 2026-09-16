// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ROLE_ROUTES, type Role } from "@/types/roles";

/** Public routes (no auth required). */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/verify",
  "/error",
];

const PUBLIC_PREFIXES = [
  "/watch", // public viewer token link
  "/api/webhook",
  "/api/upload-url", // Google Form webhook
  "/api/auth", // Supabase auth callbacks
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public routes
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

  // Fetch role from public.users (cached per-request via JWT? no — one extra query is fine)
  const role = (user.user_metadata?.role ??
    user.app_metadata?.role) as Role | undefined;

  // If role not in JWT metadata, allow through — page-level guard will block.
  if (!role) return supabaseResponse;

  const allowed = ROLE_ROUTES[role] ?? [];
  const isAllowed = allowed.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!isAllowed) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3)$).*)",
  ],
};