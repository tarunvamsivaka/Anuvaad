/**
 * @/lib/auth-context — re-exports from the canonical location.
 * Source of truth: @/infrastructure/auth-context
 * This barrel exists so existing @/lib/auth-context imports continue to work.
 */
"use client";
export { AuthProvider, useAuth } from "@/infrastructure/auth-context";
