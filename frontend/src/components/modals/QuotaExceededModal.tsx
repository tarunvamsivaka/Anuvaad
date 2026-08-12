/**
 * QuotaExceededModal — M3 Feature #7
 *
 * Polished modal shown when the backend returns HTTP 429 (daily quota exceeded).
 * Displays:
 *   - Current tier name and limit
 *   - Live countdown timer to UTC midnight reset
 *   - CTA buttons: "Upgrade to Pro" and "Dismiss"
 *
 * Usage:
 *   const { quotaError, dismissQuotaError } = useTranslationStream(...)
 *   <QuotaExceededModal error={quotaError} onClose={dismissQuotaError} />
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { X, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface QuotaError {
  detail: string;
  limit_type: "guest_daily_limit" | "user_daily_limit" | "tpm_limit" | "rpm_limit";
  retry_after_seconds: number;
  tier_limit: number;
}

export function parseQuotaErrorPayload(
  data: any,
  retryAfterHeader?: string | null
): QuotaError {
  const retryHeaderVal = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0;
  const fallbackRetry = isNaN(retryHeaderVal) ? 0 : retryHeaderVal;

  const nestedDetail = data?.detail;

  if (nestedDetail && typeof nestedDetail === "object") {
    const detailMsg = nestedDetail.detail || nestedDetail.message || "Quota limit exceeded";
    const limitType = nestedDetail.limit_type || data?.limit_type || "user_daily_limit";
    const retrySeconds =
      typeof nestedDetail.retry_after_seconds === "number"
        ? nestedDetail.retry_after_seconds
        : typeof data?.retry_after_seconds === "number"
        ? data.retry_after_seconds
        : fallbackRetry;
    const tierLimit =
      typeof nestedDetail.tier_limit === "number"
        ? nestedDetail.tier_limit
        : typeof data?.tier_limit === "number"
        ? data.tier_limit
        : 5;

    return {
      detail: detailMsg,
      limit_type: limitType,
      retry_after_seconds: retrySeconds,
      tier_limit: tierLimit,
    };
  }

  const detailMsg =
    typeof data?.detail === "string"
      ? data.detail
      : data?.message || "Quota limit exceeded";
  const limitType = data?.limit_type || "user_daily_limit";
  const retrySeconds =
    typeof data?.retry_after_seconds === "number"
      ? data.retry_after_seconds
      : fallbackRetry;
  const tierLimit = typeof data?.tier_limit === "number" ? data.tier_limit : 5;

  return {
    detail: detailMsg,
    limit_type: limitType,
    retry_after_seconds: retrySeconds,
    tier_limit: tierLimit,
  };
}

interface QuotaExceededModalProps {
  error: QuotaError | null;
  onClose: () => void;
}

function useCountdown(totalSeconds: number) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    if (totalSeconds <= 0) return;
    setRemaining(totalSeconds);
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [totalSeconds]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function QuotaExceededModal({ error, onClose }: QuotaExceededModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const countdown = useCountdown(error?.retry_after_seconds ?? 0);

  useEffect(() => {
    if (!error) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [error, onClose]);

  if (!error) return null;

  const isGuestLimit = error.limit_type === "guest_daily_limit";
  const isDailyLimit =
    error.limit_type === "guest_daily_limit" || error.limit_type === "user_daily_limit";

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quota-modal-title"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className={cn(
          "relative mx-4 w-full max-w-md rounded-2xl border border-border-subtle bg-surface-overlay shadow-2xl",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors"
          aria-label="Close quota modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/20">
              <Zap className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2
                id="quota-modal-title"
                className="text-base font-semibold text-text-primary"
              >
                {isGuestLimit ? "Guest limit reached" : "Daily limit reached"}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {isGuestLimit
                  ? `${error.tier_limit} free guest translations used`
                  : `${error.tier_limit} daily translations used`}
              </p>
            </div>
          </div>

          {/* Detail message */}
          <p className="mb-4 text-sm text-text-secondary leading-relaxed">
            {error.detail}
          </p>

          {/* Countdown (only for daily limits with >0 seconds) */}
          {isDailyLimit && error.retry_after_seconds > 0 && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-border-subtle bg-surface-card px-4 py-3">
              <Clock className="h-4 w-4 shrink-0 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted">Resets in</p>
                <p className="font-mono text-lg font-bold text-text-primary tabular-nums">
                  {countdown}
                </p>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col gap-2">
            <Link
              href="/signup?plan=pro"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-amber-400 transition-colors"
            >
              <Zap className="h-4 w-4" />
              Upgrade to Pro — Unlimited translations
            </Link>
            {isGuestLimit && (
              <Link
                href="/signup"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-subtle bg-white/5 px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-white/10 transition-colors"
              >
                Create a free account (25/day)
              </Link>
            )}
            <button
              onClick={onClose}
              className="w-full rounded-xl px-4 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
