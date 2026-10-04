import { createBrowserClient } from "@supabase/ssr";

// ---------------------------------------------------------------------------
// Supabase client (browser / client-component usage)
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is not set. " +
      "Add it to your .env.local (e.g. https://<project-ref>.supabase.co)."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. " +
      "Add it to your .env.local. You can find it in the Supabase dashboard " +
      "under Settings → API → Project API keys → anon / public."
  );
}

/**
 * Shared Supabase client for use in client components and browser-side code.
 * Uses createBrowserClient from @supabase/ssr to automatically handle cookie writing
 * and session state synchronization with Next.js Server Components.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
