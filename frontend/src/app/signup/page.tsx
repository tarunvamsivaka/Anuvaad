"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import { Loader2, Eye, EyeOff, ArrowRight, CheckCircle2, Code2, Users, TrendingUp } from "lucide-react";
import { Logo } from "@/components/landing/Logo";

const FEATURES = [
  { icon: Code2, title: "35+ Languages", desc: "Python, Rust, Go, TypeScript, SQL & more" },
  { icon: TrendingUp, title: "Instant Translation", desc: "AI-powered explanations in seconds" },
  { icon: Users, title: "Team Workspaces", desc: "Collaborate with your engineering team" },
];

const SOCIAL_PROOF = [
  "\"Cut code review time by 3×\"",
  "\"Onboarded our intern in one day\"",
  "\"Finally understand our legacy codebase\"",
];

function SignUpPageContent() {
  const searchParams = useSearchParams();
  const { signUpWithEmail, signInWithGoogle, signInWithGitHub } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setQuoteIdx(Math.floor(Math.random() * SOCIAL_PROOF.length));
  }, []);

  const rawRedirect = searchParams.get("redirectTo") || "/dashboard";
  const redirectTo = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) {
      setError("Registration failed. Please check your inputs.");
      return;
    }
    setError("");
    setLoading(true);
    const { error } = await signUpWithEmail(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      track("signup_completed", { method: "email" });
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setTimeout(() => { window.location.href = redirectTo; }, 500);
      } else {
        setSuccess(true);
      }
    }
  }

  async function handleGoogle() {
    track("signup_completed", { method: "google" });
    const { error } = await signInWithGoogle();
    if (error) setError(error);
  }

  async function handleGitHub() {
    track("signup_completed", { method: "github" });
    const { error } = await signInWithGitHub();
    if (error) setError(error);
  }

  if (success) {
    return (
      <div className="auth-bg flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="glass-dark rounded-2xl p-10 border border-amber-500/15">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              We sent a verification link to{" "}
              <span className="font-semibold text-amber-400">{email}</span>.
              Click it to activate your account.
            </p>
            <Link
              href="/signin"
              className="inline-flex items-center gap-2 text-sm font-medium text-amber-500/80 hover:text-amber-400 transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-bg flex min-h-screen">
      {/* Left panel — value proposition */}
      <div className="hidden lg:flex lg:w-[50%] flex-col items-center justify-center p-12 relative border-r border-amber-500/8">
        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.03) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-10 flex justify-center">
            <Link href="/">
              <Logo showText iconSize={28} textSize="text-lg" />
            </Link>
          </div>

          <h2 className="mb-3 text-3xl font-bold text-white leading-tight">
            Understand code.<br />
            <span className="gradient-text-amber">Ship faster.</span>
          </h2>
          <p className="mb-10 text-sm text-slate-400 leading-relaxed max-w-sm">
            Start for free — no credit card required. 10 translations per day on the free plan.
          </p>

          {/* Feature list */}
          <div className="space-y-4 mb-10">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 rounded-xl border border-amber-500/10 bg-amber-500/4 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/15">
                  <Icon className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="rounded-xl border border-amber-500/10 bg-amber-500/3 px-5 py-4">
            <p className="text-sm font-medium text-slate-300 italic leading-relaxed">
              {mounted ? SOCIAL_PROOF[quoteIdx] : SOCIAL_PROOF[0]}
            </p>
            <p className="mt-2 text-[10px] text-slate-600 font-semibold uppercase tracking-widest">— Engineer on Anuvaad</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="mb-8 flex justify-center lg:hidden">
          <Link href="/">
            <Logo showText iconSize={24} textSize="text-base" />
          </Link>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="mt-1.5 text-sm text-slate-400">Start translating code for free — takes 30 seconds.</p>
          </div>

          {/* OAuth */}
          <div className="space-y-2.5 mb-6">
            <button
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all hover:bg-white/8 hover:border-white/20 hover:text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button
              onClick={handleGitHub}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all hover:bg-white/8 hover:border-white/20 hover:text-white"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/8" />
            </div>
            <div className="relative flex justify-center text-[11px]">
              <span className="px-3 bg-transparent text-slate-500">or sign up with email</span>
            </div>
          </div>

          {/* Email form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="absolute overflow-hidden h-0 w-0 -z-50 opacity-0" aria-hidden="true">
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-xs font-medium text-slate-400 mb-1.5">Email address</label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/20 text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/20 text-sm pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-amber-shimmer relative w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold tracking-wide shadow-lg hover:shadow-amber-500/25 transition-all duration-300 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>
              ) : (
                <><ArrowRight className="h-4 w-4" /> Create Free Account</>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/signin" className="font-semibold text-amber-500/80 hover:text-amber-400 transition-colors">
              Sign in
            </Link>
          </p>

          <p className="mt-4 text-center text-[10px] text-slate-600">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-slate-400 transition-colors">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-slate-400 transition-colors">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="auth-bg flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    }>
      <SignUpPageContent />
    </Suspense>
  );
}
