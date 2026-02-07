import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this reads the auth cookies, validates the JWT,
  // and refreshes the token if expired.
  const { data, error } = await supabase.auth.getClaims();

  const url = request.nextUrl;
  const isPublic =
    url.pathname === "/" ||
    url.pathname === "/login" ||
    url.pathname.startsWith("/auth/");

  // If not authenticated and trying to access a protected route → redirect
  if (!isPublic && (error || !data)) {
    const loginUrl = url.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and on /login → redirect to dashboard
  if (url.pathname === "/login" && data && !error) {
    const dashboardUrl = url.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}
