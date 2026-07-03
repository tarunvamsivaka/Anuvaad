/**
 * frontend/src/app/onboarding/page.tsx
 *
 * FIX-35 (P3-08): User Onboarding Flow
 *
 * A 5-step guided onboarding experience for new users. After completion,
 * the backend marks `onboarded=true` so returning users are not redirected here.
 *
 * Steps:
 *   1. Welcome  — product overview
 *   2. Credits  — explain free tier limits
 *   3. Translate — first translation walkthrough
 *   4. GitHub   — GitHub import demo
 *   5. Done     — redirect to /dashboard
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Code2, Zap, GitBranch, History, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STEPS = [
  {
    id: "welcome",
    icon: <Code2 className="h-10 w-10 text-amber-400" />,
    title: "Welcome to Anuvaad",
    subtitle: "Your AI-powered code translation workspace",
    content: (
      <div className="space-y-4 text-sm text-zinc-400">
        <p>
          Anuvaad helps you understand, translate, and convert code across <strong className="text-zinc-200">35+ programming languages</strong> using state-of-the-art AI.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          {[
            { label: "Code → English", desc: "Understand any codebase instantly" },
            { label: "English → Code", desc: "Describe it, get working code" },
            { label: "Code → Code", desc: "Port across languages in seconds" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="font-semibold text-amber-400 text-xs mb-1">{item.label}</p>
              <p className="text-xs text-zinc-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "credits",
    icon: <Zap className="h-10 w-10 text-amber-400" />,
    title: "Free Tier & Credits",
    subtitle: "Understand your usage limits",
    content: (
      <div className="space-y-4 text-sm text-zinc-400">
        <p>You start with <strong className="text-zinc-200">10 free translations per day</strong>. Need more?</p>
        <ul className="space-y-2 mt-4">
          {[
            "Upgrade to Pro for unlimited translations",
            "Buy credit packs for occasional heavy use",
            "Credits roll over — they never expire",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-xs font-semibold text-amber-400">Pro tip</p>
          <p className="text-xs text-zinc-400 mt-1">Pro users get access to DeepSeek R1 for advanced reasoning tasks — great for complex refactoring.</p>
        </div>
      </div>
    ),
  },
  {
    id: "translate",
    icon: <Code2 className="h-10 w-10 text-amber-400" />,
    title: "Your First Translation",
    subtitle: "It only takes 3 clicks",
    content: (
      <div className="space-y-4 text-sm text-zinc-400">
        <ol className="space-y-3">
          {[
            { step: "1", text: "Paste your code into the left panel" },
            { step: "2", text: "Select source and target languages (or leave auto-detect on)" },
            { step: "3", text: "Click Translate — results stream in real-time" },
          ].map((item) => (
            <li key={item.step} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">
                {item.step}
              </span>
              <span>{item.text}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex justify-center">
          <Link
            href="/dashboard/translate"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-400 transition-colors"
          >
            Try it now <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    ),
  },
  {
    id: "github",
    icon: <GitBranch className="h-10 w-10 text-amber-400" />,
    title: "GitHub Integration",
    subtitle: "Import from any public repository",
    content: (
      <div className="space-y-4 text-sm text-zinc-400">
        <p>Connect your GitHub account to:</p>
        <ul className="space-y-2">
          {[
            "Browse and import files from any of your repositories",
            "Translate entire files in one click",
            "Save translated files back to a branch",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-zinc-500 mt-4">
          You can connect GitHub anytime in <strong className="text-zinc-300">Settings → Integrations</strong>.
        </p>
      </div>
    ),
  },
  {
    id: "done",
    icon: <CheckCircle2 className="h-10 w-10 text-emerald-400" />,
    title: "You're all set!",
    subtitle: "Welcome to the Anuvaad community",
    content: (
      <div className="space-y-4 text-sm text-zinc-400 text-center">
        <p>Your account is ready. Head to the dashboard to start translating.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <Link
            href="/dashboard/translate"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-400 transition-colors"
          >
            Start Translating <Code2 className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard/history"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            View History <History className="h-4 w-4" />
          </Link>
        </div>
      </div>
    ),
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const { session } = useAuth();
  const router = useRouter();

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const markOnboarded = async () => {
    if (!session?.access_token) return;
    try {
      await fetch(`${API_BASE}/api/v1/onboarding/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    } catch {
      // Non-critical — user can still proceed
    }
  };

  const handleNext = async () => {
    if (isLast) {
      setCompleting(true);
      await markOnboarded();
      router.push("/dashboard");
    } else {
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{ background: i <= step ? "#f59e0b" : "#27272a" }}
            />
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
          {/* Icon + header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="mb-4 rounded-2xl bg-zinc-800 p-4">
              {current.icon}
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">{current.title}</h1>
            <p className="text-sm text-zinc-500 mt-1">{current.subtitle}</p>
          </div>

          {/* Step content */}
          <div className="mb-8">{current.content}</div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={step === 0}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <span className="text-xs text-zinc-600">
              {step + 1} / {STEPS.length}
            </span>

            <button
              onClick={handleNext}
              disabled={completing}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {completing ? "Setting up…" : isLast ? "Go to Dashboard" : "Next"}
              {!completing && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Skip link */}
        {!isLast && (
          <div className="text-center mt-4">
            <button
              onClick={async () => { await markOnboarded(); router.push("/dashboard"); }}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
            >
              Skip onboarding
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
