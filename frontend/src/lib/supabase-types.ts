/**
 * app/lib/supabase-types.ts
 *
 * FIX-21 (P2-08): Typed Supabase session extension to eliminate `(session as any)` casts.
 *
 * Supabase stores arbitrary user metadata in `user_metadata`. Since the SDK types it as
 * `Record<string, unknown>`, we create a narrow interface for Anuvaad-specific fields and
 * expose a typed helper instead of repetitive unsafe casts.
 */

import type { Session } from "@supabase/supabase-js";

/** Anuvaad-specific fields stored in Supabase user_metadata. */
export interface AnuvaadUserMetadata {
  credits?: number;
  tier?: "free" | "pro";
  is_pro?: boolean;
  onboarded?: boolean;
  avatar_url?: string;
  full_name?: string;
}

/** Typed Supabase session with Anuvaad user_metadata fields. */
export interface AnuvaadSession extends Session {
  user: Session["user"] & {
    user_metadata: AnuvaadUserMetadata;
  };
}

/**
 * Cast a raw Session (or null) to AnuvaadSession | null.
 * Avoids spreading `as any` casts throughout the codebase.
 */
export function asAnuvaadSession(session: Session | null): AnuvaadSession | null {
  return session as AnuvaadSession | null;
}
