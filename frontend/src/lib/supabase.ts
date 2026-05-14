import { createClient } from "@supabase/supabase-js";

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
 *
 * **Security note:** The anon key exposed here is *public by design* in
 * Supabase's architecture. It is safe to bundle into client-side JavaScript
 * because all data access is governed by Row Level Security (RLS) policies on
 * the database — the key alone grants no privileged access. Never embed the
 * `service_role` key in frontend code.
 *
 * @see https://supabase.com/docs/guides/api/api-keys
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
