import { createBrowserClient } from "@supabase/ssr";

// ---------------------------------------------------------------------------
// Supabase client (browser / client-component usage)
// ---------------------------------------------------------------------------

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_anon_key_for_ci_build";

if (
  typeof window !== "undefined" &&
  (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
) {
  console.warn(
    "[Anuvaad] Supabase credentials missing; running with placeholder configuration."
  );
}

/**
 * Shared Supabase client for use in client components and browser-side code.
 * Uses createBrowserClient from @supabase/ssr to automatically handle cookie writing
 * and session state synchronization with Next.js Server Components.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
