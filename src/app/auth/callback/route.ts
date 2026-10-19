import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const ROLE_HOME: Record<string, string> = {
  MAIN_CONTROLLER: "/dashboard",
  AUCTIONEER: "/auctioneer/console",
  CAPTAIN: "/captain/bid",
  VIEWER: "/viewer/live",
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  // Final response — all cookies from Supabase get attached to THIS object.
  const response = NextResponse.redirect(`${origin}/dashboard`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  const role = (data.user?.app_metadata?.role as string) ?? "VIEWER";
  const home = ROLE_HOME[role] ?? "/dashboard";
  const target = next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : home;

  // Mutate the SAME response — cookies already attached.
  response.headers.set("Location", `${origin}${target}`);
  return response;
}