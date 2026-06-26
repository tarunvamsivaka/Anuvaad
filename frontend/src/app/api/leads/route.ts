import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/leads
 * Accepts { email, source? } and inserts into landing_leads.
 * RLS on the table allows anon INSERT only (no read/update/delete).
 * Server-side email validation prevents garbage data.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const source = typeof body.source === "string" ? body.source : "exit_intent";

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase
      .from("landing_leads")
      .insert({ email, source });

    if (error) {
      // Unique constraint violation — already subscribed
      if (error.code === "23505") {
        return NextResponse.json({ success: true, message: "already_subscribed" });
      }
      console.error("[leads] Supabase insert error:", error.message);
      return NextResponse.json({ error: "Failed to save email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[leads] Unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
