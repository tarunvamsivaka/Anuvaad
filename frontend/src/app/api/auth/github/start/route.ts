import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const state = randomBytes(32).toString("base64url");
  const loginUrl = new URL("/api/v1/oauth/github/login", apiUrl);
  loginUrl.searchParams.set("state", state);

  try {
    const response = await fetch(loginUrl, { cache: "no-store", redirect: "error" });
    if (!response.ok) {
      return NextResponse.redirect(new URL("/dashboard?error=github_unavailable", request.url));
    }
    const { auth_url: authUrl } = await response.json();
    if (typeof authUrl !== "string" || !authUrl.startsWith("https://github.com/login/oauth/authorize?")) {
      return NextResponse.redirect(new URL("/dashboard?error=github_unavailable", request.url));
    }

    const result = NextResponse.redirect(authUrl);
    result.cookies.set("anuvaad_github_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/github/callback",
      maxAge: 600,
    });
    return result;
  } catch {
    return NextResponse.redirect(new URL("/dashboard?error=github_unavailable", request.url));
  }
}
