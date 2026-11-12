import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ReDoS-safe email validation with strict non-overlapping character classes
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const ALLOWED_SOURCES = new Set(["exit_intent", "landing", "waitlist"]);
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;
const MAX_TRACKED_CLIENTS = 10_000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(request: NextRequest): boolean {
  // Prefer the single-hop address supplied by the hosting edge. If unavailable,
  // use the rightmost forwarded address (the nearest proxy), not a client-supplied leftmost value.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean);
  const client = request.headers.get("x-real-ip")?.trim() || forwarded?.at(-1) || "unknown";
  const now = Date.now();
  if (attempts.size >= MAX_TRACKED_CLIENTS) {
    for (const [key, value] of attempts) {
      if (value.resetAt <= now) attempts.delete(key);
    }
    if (attempts.size >= MAX_TRACKED_CLIENTS && !attempts.has(client)) return true;
  }
  const current = attempts.get(client);
  if (!current || current.resetAt <= now) {
    attempts.set(client, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
}

async function readBoundedJson(request: NextRequest): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing request body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) {
        await reader.cancel();
        throw new RangeError("Request body too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
}

/**
 * POST /api/leads
 * Accepts { email, source? } and inserts into landing_leads.
 * RLS on the table allows anon INSERT only (no read/update/delete).
 * Server-side email validation prevents garbage data.
 */
export async function POST(req: NextRequest) {
  try {
    const lengthHeader = req.headers.get("content-length");
    const length = lengthHeader === null ? null : Number(lengthHeader);
    if ((length !== null && (!Number.isSafeInteger(length) || length < 0 || length > 2048)) || isRateLimited(req)) {
      return NextResponse.json({ error: "Request limit exceeded" }, { status: length !== null && length > 2048 ? 413 : 429 });
    }
    let body: unknown;
    try {
      body = await readBoundedJson(req);
    } catch (error) {
      if (error instanceof RangeError) return NextResponse.json({ error: "Request body too large" }, { status: 413 });
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const payload = body as Record<string, unknown>;
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const source =
      typeof payload.source === "string" && ALLOWED_SOURCES.has(payload.source) ? payload.source : "exit_intent";

    if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
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
