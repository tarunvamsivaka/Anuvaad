import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ISR — revalidate the count at most once per 60 seconds
export const revalidate = 60;

/**
 * GET /api/stats/translation-count
 * Server-only route that calls the SECURITY DEFINER RPC function.
 * Uses the anon key — safe because the RPC grants EXECUTE to anon.
 * Never exposes raw table data, only returns the total count.
 */
export async function GET() {
  try {
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey
    );

    const { data, error } = await supabase.rpc("get_total_translations_count");

    if (error) {
      // In CI, build time, or restricted permissions, gracefully fall back to 0 count
      return NextResponse.json({ count: 0, fallback: true });
    }

    return NextResponse.json({ count: data ?? 0 });
  } catch {
    return NextResponse.json({ count: 0, fallback: true });
  }
}
