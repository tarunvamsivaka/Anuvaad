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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.rpc("get_total_translations_count");

    if (error) {
      console.error("[translation-count] Supabase RPC error:", error.message);
      return NextResponse.json({ count: 0 }, { status: 500 });
    }

    return NextResponse.json({ count: data ?? 0 });
  } catch (err) {
    console.error("[translation-count] Unexpected error:", err);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
