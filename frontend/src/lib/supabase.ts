import { createBrowserClient } from "@supabase/ssr";

// ---------------------------------------------------------------------------
// Supabase client (browser / client-component usage)
// ---------------------------------------------------------------------------

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isProd = process.env.NODE_ENV === "production";
const isPlaceholderUrl = !rawUrl || rawUrl.includes("placeholder.supabase.co") || rawUrl.includes("your-");
const isPlaceholderKey = !rawAnonKey || rawAnonKey.includes("placeholder_anon_key") || rawAnonKey.includes("your-");

// FE-02: Fail fast if strict check is enabled, otherwise warn/error safely without breaking CI placeholder builds
if (isProd && (isPlaceholderUrl || isPlaceholderKey)) {
  const errMsg =
    "[Anuvaad Security] CRITICAL: Production deployment detected without valid Supabase configuration! " +
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.";
  if (process.env.STRICT_SUPABASE_CHECK === "true") {
    throw new Error(errMsg);
  }
  if (typeof window !== "undefined") {
    console.error(errMsg);
  }
} else if (typeof window !== "undefined" && (isPlaceholderUrl || isPlaceholderKey)) {
  console.warn(
    "[Anuvaad] Supabase credentials missing or placeholder; running in development preview mode."
  );
}

const supabaseUrl = rawUrl || "https://placeholder.supabase.co";
const supabaseAnonKey = rawAnonKey || "placeholder_anon_key_for_ci_build";

/**
 * Shared Supabase client for use in client components and browser-side code.
 * Uses createBrowserClient from @supabase/ssr to automatically handle cookie writing
 * and session state synchronization with Next.js Server Components.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
