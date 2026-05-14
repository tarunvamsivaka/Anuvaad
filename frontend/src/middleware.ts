import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Create a response object we can modify (set cookies for token refresh)
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies on the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Recreate the response so it carries the updated request cookies
          supabaseResponse = NextResponse.next({
            request: { headers: request.headers },
          });
          // Set cookies on the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT use getSession() here — it reads from local storage only.
  // getUser() makes a secure call to the Supabase Auth server to validate the JWT.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated → redirect to /signin immediately (no HTML flash)
  if (!user) {
    const signInUrl = new URL("/signin", request.url);
    // Preserve the original destination so we can redirect back after login
    signInUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Authenticated → pass through with refreshed cookie headers
  return supabaseResponse;
}

// ---------------------------------------------------------------------------
// Matcher: only run middleware on /dashboard and its sub-routes.
// Explicitly EXCLUDE /api/*, /signin, /signup, /_next/*, and static assets.
// ---------------------------------------------------------------------------
export const config = {
  matcher: ["/dashboard/:path*"],
};
