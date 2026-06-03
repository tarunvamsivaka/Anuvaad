"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { ArrowRight, Code2, BookOpen, Repeat, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isFinishing, setIsFinishing] = useState(false);

  const demoCode = `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))`;

  const handleSkip = async () => {
    setIsFinishing(true);
    await supabase.auth.updateUser({ data: { onboarded: true } });
    router.push("/dashboard");
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    await supabase.auth.updateUser({ data: { onboarded: true } });
    router.push("/dashboard");
  };

  const nextStep = () => {
    if (step === 2) {
      // Trigger confetti when entering step 3
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f5a623", "#c8860a", "#7a5006"],
      });
    }
    setStep(step + 1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#030303] text-slate-100 relative overflow-hidden">
      
      {/* Skip Button */}
      <div className="absolute top-6 right-8 z-10">
        <button
          onClick={handleSkip}
          disabled={isFinishing}
          className="text-xs uppercase tracking-wider font-extrabold text-slate-500 hover:text-amber-500 transition-colors"
        >
          Skip onboarding
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-4xl mx-auto w-full">
        {/* Progress Dots */}
        <div className="flex gap-2.5 mb-12">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-12 rounded-full transition-all duration-500 ${
                s === step
                  ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                  : s < step
                  ? "bg-amber-500/40"
                  : "bg-slate-800"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Make your first translation */}
        {step === 1 && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-500 mb-6 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
              <Code2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-slate-200">
              Initialize Translation Engine
            </h1>
            <p className="text-slate-400 max-w-lg mb-8 text-sm leading-relaxed">
              Anuvaad parses legacy files, redacts database inputs, and generates highly annotated plain English maps using Google Gemini core weights.
            </p>

            <div className="w-full max-w-lg bg-[#0c0c0f]/80 border border-amber-600/10 rounded-xl overflow-hidden mb-8 text-left shadow-lg">
              <div className="bg-slate-950 px-4 py-2.5 border-b border-amber-600/10 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/40"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/40"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/40"></div>
                <span className="ml-2 text-[10px] uppercase font-bold tracking-wider text-slate-500">fibonacci.py</span>
              </div>
              <pre className="p-5 overflow-x-auto text-xs text-amber-200/90 font-mono bg-slate-950/20">
                <code>{demoCode}</code>
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 items-center">
              <button
                onClick={nextStep}
                className="text-xs uppercase tracking-wider font-extrabold text-slate-500 hover:text-slate-300"
              >
                Skip Walkthrough
              </button>
              <Link
                href={`/dashboard/translate?code=${encodeURIComponent(demoCode)}&lang=python&mode=code-to-english`}
                className="inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 hover:text-slate-950 shadow transition-colors h-11 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                onClick={async (e) => {
                  e.preventDefault();
                  await supabase.auth.updateUser({ data: { onboarded: true } });
                  router.push(`/dashboard/translate?code=${encodeURIComponent(demoCode)}&lang=python&mode=code-to-english`);
                }}
              >
                Execute Pipeline <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Step 2: Try all three modes */}
        {step === 2 && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-slate-200">
              Versatile Translation Architectures
            </h1>
            <p className="text-slate-400 max-w-xl mb-12 text-sm leading-relaxed">
              Toggle between three processing loops depending on your integration context: translating documentation, synthesizing specs, or rewriting languages.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
              <div className="bg-[#0c0c0f]/80 border border-amber-600/10 p-6 rounded-xl shadow-lg text-left hover:border-amber-500/30 transition-all duration-300 group relative">
                <div className="h-10 w-10 rounded-lg bg-amber-500/5 border border-amber-500/15 flex items-center justify-center mb-4 text-amber-500">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="font-bold uppercase tracking-wider text-slate-200 text-xs mb-2">Code ➔ English</h3>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Generate logical prose outlines and line-by-line analyses of raw workspace files.
                </p>
                <Link
                  href="/dashboard/translate?mode=code-to-english"
                  onClick={async (e) => {
                    e.preventDefault();
                    await supabase.auth.updateUser({ data: { onboarded: true } });
                    router.push("/dashboard/translate?mode=code-to-english");
                  }}
                  className="text-xs font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 flex items-center mt-auto"
                >
                  Load Mode <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="bg-[#0c0c0f]/80 border border-amber-600/10 p-6 rounded-xl shadow-lg text-left hover:border-amber-500/30 transition-all duration-300 group relative">
                <div className="h-10 w-10 rounded-lg bg-amber-500/5 border border-amber-500/15 flex items-center justify-center mb-4 text-amber-500">
                  <Code2 className="h-5 w-5" />
                </div>
                <h3 className="font-bold uppercase tracking-wider text-slate-200 text-xs mb-2">English ➔ Code</h3>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Synthesize complete, structured code statements from high-level natural instructions.
                </p>
                <Link
                  href="/dashboard/translate?mode=english-to-code"
                  onClick={async (e) => {
                    e.preventDefault();
                    await supabase.auth.updateUser({ data: { onboarded: true } });
                    router.push("/dashboard/translate?mode=english-to-code");
                  }}
                  className="text-xs font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 flex items-center mt-auto"
                >
                  Load Mode <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="bg-[#0c0c0f]/80 border border-amber-600/10 p-6 rounded-xl shadow-lg text-left hover:border-amber-500/30 transition-all duration-300 group relative">
                <div className="h-10 w-10 rounded-lg bg-amber-500/5 border border-amber-500/15 flex items-center justify-center mb-4 text-amber-500">
                  <Repeat className="h-5 w-5" />
                </div>
                <h3 className="font-bold uppercase tracking-wider text-slate-200 text-xs mb-2">Code ➔ Code</h3>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Cross-compile raw scripts between 35+ supported syntactic frameworks instantly.
                </p>
                <Link
                  href="/dashboard/translate?mode=code-to-code"
                  onClick={async (e) => {
                    e.preventDefault();
                    await supabase.auth.updateUser({ data: { onboarded: true } });
                    router.push("/dashboard/translate?mode=code-to-code");
                  }}
                  className="text-xs font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 flex items-center mt-auto"
                >
                  Load Mode <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <button
              onClick={nextStep}
              className="inline-flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 px-8 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 transition-colors h-11"
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 3: You are ready */}
        {step === 3 && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/5 border border-green-500/20 text-green-500 mb-6">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-slate-200">
              System Operations Ready
            </h1>
            <p className="text-slate-400 max-w-sm mb-8 text-sm leading-relaxed">
              Your profile is verified. Access the workspace cluster to translate, optimize, and build without bounds.
            </p>

            <button
              onClick={handleFinish}
              disabled={isFinishing}
              className="inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 px-8 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 hover:text-slate-950 shadow transition-colors h-11 shadow-[0_0_12px_rgba(245,158,11,0.2)] disabled:opacity-50"
            >
              {isFinishing ? "Launching..." : "Enter Workspace"} <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
