import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isTrustedMutation } from "@/lib/security/request";

const PUBLIC_PATHS = [
  "/",
  "/demo",
  "/login",
  "/verify",
  "/error",
  "/site.webmanifest",
];
const PUBLIC_PREFIXES = ["/watch", "/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // API routes perform their own getUser + role checks. Do not add a second
  // auth round trip to every bid; this boundary only blocks cross-origin writes.
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    if (!isTrustedMutation(request))
      return NextResponse.json(
        { error: "Cross-origin request denied" },
        { status: 403 },
      );
    return NextResponse.next();
  }
  if (pathname === "/demo") return NextResponse.next();
  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  // Allow the product page/demo to be inspected without database credentials.
  // Protected screens remain unavailable until authentication is configured.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return isPublic
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", request.url));
  }
  const { supabaseResponse, user } = await updateSession(request);
  if (!isPublic && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    const response = NextResponse.redirect(url);
    // Preserve refreshed/cleared cookies on redirects too.
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  }
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|ico|webmanifest|woff2)$).*)",
  ],
};
