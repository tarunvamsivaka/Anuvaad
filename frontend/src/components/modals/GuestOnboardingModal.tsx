/**
 * GuestOnboardingModal — M3 Feature #11
 *
 * Friendly, non-blocking sign-up prompt shown when guest users attempt
 * high-intent actions (Gist import, code export, translation save/sync).
 */
"use client";

import { useEffect, useRef } from "react";
import { X, Sparkles, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface GuestOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueAsGuest?: () => void;
  reason?: "gist" | "save" | "export";
}

export function GuestOnboardingModal({
  isOpen,
  onClose,
  onContinueAsGuest,
  reason = "save",
}: GuestOnboardingModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const reasonTitles: Record<string, string> = {
    gist: "Sign up to import GitHub Gists",
    save: "Sign up to save & sync translation history",
    export: "Sign up to export code & access history",
  };

  const handleGuestContinue = () => {
    onClose();
    onContinueAsGuest?.();
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-modal-title"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className={cn(
          "relative mx-4 w-full max-w-md rounded-2xl border border-border-subtle bg-surface-overlay shadow-2xl p-6",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/20">
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 id="guest-modal-title" className="text-base font-semibold text-text-primary">
              {reasonTitles[reason] || "Unlock Free Account Benefits"}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Create a free account in 10 seconds — no credit card required.
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-border-subtle bg-surface-card p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
            <span><strong className="text-text-primary">25 free translations/day</strong> (vs 5 guest limit)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
            <span><strong className="text-text-primary">Cloud history sync</strong> & session saving</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
            <span><strong className="text-text-primary">GitHub Gist imports</strong> & export tools</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href={`/signup?reason=${reason}`}
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-amber-400 transition-colors"
          >
            Sign Up / Log In
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={handleGuestContinue}
            className="w-full rounded-xl border border-border-subtle bg-white/5 px-4 py-2 text-sm text-text-muted hover:bg-white/10 hover:text-text-secondary transition-colors"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
