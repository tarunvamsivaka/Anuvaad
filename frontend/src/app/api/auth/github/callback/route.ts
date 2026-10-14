import { timingSafeEqual } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get("anuvaad_github_oauth_state")?.value;
  const clearStateCookie = (response: NextResponse) => {
    response.cookies.set("anuvaad_github_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/github/callback",
      maxAge: 0,
    });
    return response;
  };

  if (
    error || !code || !state || !expectedState ||
    Buffer.byteLength(state) !== Buffer.byteLength(expectedState) ||
    !timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))
  ) {
    return clearStateCookie(NextResponse.redirect(
      `${origin}/dashboard?error=${encodeURIComponent(error || "github_oauth_state_invalid")}`
    ));
  }

  // Retrieve current user's session from Supabase cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return clearStateCookie(NextResponse.redirect(`${origin}/signin?redirectTo=/dashboard`));
  }

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  try {
    const callbackUrl = new URL(`${backendUrl}/api/v1/oauth/github/callback`);
    callbackUrl.searchParams.set("code", code);
    callbackUrl.searchParams.set("state", state);
    const res = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return clearStateCookie(NextResponse.redirect(
        `${origin}/dashboard?error=${encodeURIComponent(errData.detail || "github_connect_failed")}`
      ));
    }

    return clearStateCookie(NextResponse.redirect(`${origin}/dashboard?github=connected`));
  } catch {
    return clearStateCookie(NextResponse.redirect(`${origin}/dashboard?error=github_connect_failed`));
  }
}
