import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isTrustedMutation } from "@/lib/security/request";
import { limitAuctionTraffic } from "@/lib/security/auction-throttle";

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
    // A local safety backstop ahead of expensive auction API handlers.
    // For global rate limits configure Vercel Firewall or another shared store.
    const parts = pathname.split("/");
    const operation = parts.length === 5 &&
      parts[1] === "api" && parts[2] === "auction" &&
      /^[a-f0-9-]{36}$/i.test(parts[3]) ? parts[4] : null;
    const mutation = request.method === "POST" && operation &&
      ["sell", "unsold", "undo-bid", "next-player", "skip-player",
       "start", "end", "pause", "resume", "reset", "topup",
       "finalize-captains", "round2"].includes(operation);
    if (mutation) {
      // Vercel overwrites this forwarded header at its trusted proxy.
      const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const { allowed, retryAfter } = limitAuctionTraffic(
        `auction-write:${ip}`, 45, 60_000,
      );
      if (!allowed) {
        return NextResponse.json(
          { error: "Too many auction commands. Retry shortly." },
          { status: 429, headers: {
            "Retry-After": String(retryAfter), "Cache-Control": "no-store",
          } },
        );
      }
    }
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
