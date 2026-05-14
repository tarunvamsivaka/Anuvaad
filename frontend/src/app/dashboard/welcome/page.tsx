"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
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
      if (typeof window !== "undefined" && (window as any).confetti) {
        (window as any).confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#f59e0b", "#d97706", "#b45309"],
        });
      }
    }
    setStep(step + 1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js" strategy="lazyOnload" />
      
      {/* Skip Button */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={handleSkip}
          disabled={isFinishing}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip onboarding
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-4xl mx-auto w-full">
        {/* Progress Dots */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-12 rounded-full transition-all duration-300 ${
                s === step
                  ? "bg-amber-500"
                  : s < step
                  ? "bg-amber-500/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Make your first translation */}
        {step === 1 && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500 mb-6">
              <Code2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Make your first translation
            </h1>
            <p className="text-muted-foreground max-w-lg mb-8 text-lg">
              Anuvaad analyzes and translates your code using advanced AI. Try explaining this Python snippet in English.
            </p>

            <div className="w-full max-w-lg bg-card border border-border/60 rounded-xl overflow-hidden mb-8 text-left shadow-sm">
              <div className="bg-muted px-4 py-2 border-b border-border/60 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
                <div className="h-3 w-3 rounded-full bg-amber-500/80"></div>
                <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
                <span className="ml-2 text-xs font-medium text-muted-foreground">fibonacci.py</span>
              </div>
              <pre className="p-4 overflow-x-auto text-sm text-amber-700 dark:text-amber-300">
                <code>{demoCode}</code>
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <button
                onClick={nextStep}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Next step
              </button>
              <Link
                href={\`/dashboard/translate?code=\${encodeURIComponent(demoCode)}&lang=python&mode=code-to-english\`}
                className="inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 px-6 py-3 text-sm font-medium text-white shadow transition-colors"
                onClick={async (e) => {
                  e.preventDefault();
                  await supabase.auth.updateUser({ data: { onboarded: true } });
                  router.push(\`/dashboard/translate?code=\${encodeURIComponent(demoCode)}&lang=python&mode=code-to-english\`);
                }}
              >
                Try it now <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Step 2: Try all three modes */}
        {step === 2 && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center text-center">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Try all three modes
            </h1>
            <p className="text-muted-foreground max-w-xl mb-12 text-lg">
              Anuvaad is versatile. Whether you're learning, writing, or migrating, we have a tool for you.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
              <div className="bg-card border border-border/60 p-6 rounded-xl shadow-sm text-left hover:border-amber-500/50 transition-colors group">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-500">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Code → English</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Break down complex code into simple, line-by-line English explanations.
                </p>
                <Link
                  href="/dashboard/translate?mode=code-to-english"
                  onClick={async (e) => {
                    e.preventDefault();
                    await supabase.auth.updateUser({ data: { onboarded: true } });
                    router.push("/dashboard/translate?mode=code-to-english");
                  }}
                  className="text-sm font-medium text-amber-600 dark:text-amber-500 group-hover:underline flex items-center"
                >
                  Try this mode <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>

              <div className="bg-card border border-border/60 p-6 rounded-xl shadow-sm text-left hover:border-amber-500/50 transition-colors group">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-500">
                  <Code2 className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg mb-2">English → Code</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Describe what you want to build, and Anuvaad will write the code for you.
                </p>
                <Link
                  href="/dashboard/translate?mode=english-to-code"
                  onClick={async (e) => {
                    e.preventDefault();
                    await supabase.auth.updateUser({ data: { onboarded: true } });
                    router.push("/dashboard/translate?mode=english-to-code");
                  }}
                  className="text-sm font-medium text-amber-600 dark:text-amber-500 group-hover:underline flex items-center"
                >
                  Try this mode <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>

              <div className="bg-card border border-border/60 p-6 rounded-xl shadow-sm text-left hover:border-amber-500/50 transition-colors group">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-500">
                  <Repeat className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Code → Code</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Seamlessly translate code from one programming language to another.
                </p>
                <Link
                  href="/dashboard/translate?mode=code-to-code"
                  onClick={async (e) => {
                    e.preventDefault();
                    await supabase.auth.updateUser({ data: { onboarded: true } });
                    router.push("/dashboard/translate?mode=code-to-code");
                  }}
                  className="text-sm font-medium text-amber-600 dark:text-amber-500 group-hover:underline flex items-center"
                >
                  Try this mode <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>
            </div>

            <button
              onClick={nextStep}
              className="inline-flex items-center justify-center rounded-lg bg-foreground hover:bg-foreground/90 px-8 py-3 text-sm font-medium text-background shadow transition-colors"
            >
              Next step <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 3: You are ready */}
        {step === 3 && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-green-500 mb-6">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              You are ready!
            </h1>
            <p className="text-muted-foreground max-w-md mb-8 text-lg">
              Your workspace is set up. You can now start translating, building, and exploring code effortlessly.
            </p>

            <button
              onClick={handleFinish}
              disabled={isFinishing}
              className="inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 px-8 py-3 text-base font-medium text-white shadow transition-colors disabled:opacity-50"
            >
              {isFinishing ? "Loading..." : "Go to dashboard"} <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
