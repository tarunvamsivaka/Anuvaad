import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/dashboard?error=${encodeURIComponent(error || "missing_code")}`);
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
    return NextResponse.redirect(`${origin}/signin?redirectTo=/dashboard`);
  }

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  try {
    const res = await fetch(`${backendUrl}/api/v1/oauth/github/callback?code=${encodeURIComponent(code)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.redirect(
        `${origin}/dashboard?error=${encodeURIComponent(errData.detail || "github_connect_failed")}`
      );
    }

    return NextResponse.redirect(`${origin}/dashboard?github=connected`);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "network_error";
    return NextResponse.redirect(`${origin}/dashboard?error=${encodeURIComponent(errMsg)}`);
  }
}
