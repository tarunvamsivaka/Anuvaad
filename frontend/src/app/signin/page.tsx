"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  Terminal,
} from "lucide-react";
import { Logo } from "@/components/landing/Logo";

const SIGN_IN_STEPS = [
  { id: "01", name: "Bring a code sample", detail: "Paste a snippet or open the translation workspace." },
  { id: "02", name: "Choose what you need", detail: "Explain code or translate between supported languages." },
  { id: "03", name: "Review the result", detail: "Keep the generated output beside its source." },
];

function getSafeRedirectUrl(target: string | null): string {
  if (!target) return "/dashboard";
  const trimmed = target.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes("://") &&
    !/[\r\n\t]/.test(trimmed)
  ) {
    return trimmed;
  }
  return "/dashboard";
}

function SignInPageContent() {
  const { signInWithEmail, signInWithGoogle, signInWithGitHub } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [redirectTo, setRedirectTo] = useState("/dashboard");

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("redirectTo");
    setRedirectTo(getSafeRedirectUrl(raw));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) {
      setError("Authentication failed. Please verify credentials.");
      return;
    }
    setError("");
    setLoading(true);
    track("signin_attempted", { method: "email" });
    const { error: err } = await signInWithEmail(email, password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      const dest = getSafeRedirectUrl(redirectTo);
      setTimeout(() => {
        window.location.href = dest;
      }, 400);
    }
  }

  async function handleGoogle() {
    track("signin_attempted", { method: "google" });
    const { error: err } = await signInWithGoogle();
    if (err) setError(err);
  }

  async function handleGitHub() {
    track("signin_attempted", { method: "github" });
    const { error: err } = await signInWithGitHub();
    if (err) setError(err);
  }

  return (
    <div className="min-h-screen bg-[#060709] text-slate-100 flex flex-col lg:flex-row selection:bg-amber-500/30 selection:text-amber-200">
      {/* ── Left Column: Artisanal Systems Telemetry & Rosetta Console ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative border-r border-slate-800 bg-[#080d1a]/60">
        {/* Subtle Architectural Grid Background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Top Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/"
              className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg"
              aria-label="Anuvaad Home"
            >
              <Logo showText iconSize={26} textSize="text-base" theme="dark" />
            </Link>
          </div>

          <p className="max-w-md text-sm leading-6 text-slate-400">A focused workspace for understanding code and checking a translation against its source.</p>
        </div>

        {/* Middle Interactive Compiler Terminal */}
        <div className="relative z-10 w-full max-w-lg my-8">
          <div className="rounded-2xl border border-slate-800 bg-[#060709] obsidian-deck shadow-2xl overflow-hidden">
            {/* Terminal Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                <Terminal className="h-3.5 w-3.5 text-amber-500" />
                <span>ANUVAAD / WORKFLOW</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="led-indicator led-emerald" />
                <span className="font-mono text-[10px] text-slate-400">THREE SIMPLE STEPS</span>
              </div>
            </div>

            {/* Terminal Pipeline Sequence */}
            <div className="p-5 font-mono text-xs space-y-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-800/80 pb-2">
                FROM CODE TO A REVIEWABLE RESULT
              </div>

              {SIGN_IN_STEPS.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-amber-500 font-bold">[{st.id}]</span>
                    <div>
                      <span className="block text-slate-200">{st.name}</span>
                      <span className="mt-1 block max-w-sm font-sans text-[11px] leading-5 text-slate-400">{st.detail}</span>
                    </div>
                  </div>
                </div>
              ))}

              <p className="border-t border-slate-800/80 pt-3 text-[11px] leading-5 text-slate-400">For data handling details, read the <Link href="/privacy" className="text-slate-200 underline decoration-amber-500 underline-offset-4">privacy page</Link>.</p>
            </div>
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 font-mono text-xs text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-6">
          <div className="flex items-center gap-2">
            <span>Have an account? Sign in on the right.</span>
          </div>
          <Link href="/privacy" className="hover:text-slate-300 transition-colors">
            Privacy details →
          </Link>
        </div>
      </div>

      {/* ── Right Column: Developer Authentication Form ── */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 relative">
        {/* Mobile Header */}
        <div className="mb-8 flex flex-col items-center lg:hidden">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <Logo showText iconSize={26} textSize="text-base" theme="dark" />
          </Link>
        </div>

        <div className="w-full max-w-sm">
          {/* Card Eyebrow & Status */}
          <div className="mb-8 text-center sm:text-left">
            <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="led-indicator led-emerald" />
              <span>WELCOME BACK</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sign in to Anuvaad
            </h1>
            <p className="mt-1.5 text-xs text-slate-400">
              Sign in with GitHub or Google, or use your email and password.
            </p>
          </div>

          {/* Developer OAuth Docks */}
          <div className="space-y-2.5 mb-6">
            <button
              type="button"
              onClick={handleGitHub}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 hover:border-slate-700 px-4 py-2.5 text-xs font-mono font-medium text-slate-200 transition-all cursor-pointer shadow-xs"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>Authenticate with GitHub</span>
            </button>

            <button
              type="button"
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 hover:border-slate-700 px-4 py-2.5 text-xs font-mono font-medium text-slate-200 transition-all cursor-pointer shadow-xs"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Authenticate with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-wider">
              <span className="px-3 bg-[#060709] text-slate-500">OR USE YOUR EMAIL</span>
            </div>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Honeypot field */}
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
              <label
                htmlFor="signin-email"
                className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5"
              >
                EMAIL ADDRESS
              </label>
              <Input
                id="signin-email"
                type="email"
                placeholder="developer@systems.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs font-mono"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="signin-password"
                  className="text-[11px] font-mono uppercase tracking-wider text-slate-400"
                >
                  CREDENTIAL // SECRET
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-mono text-amber-500 hover:text-amber-400 transition-colors"
                >
                  Reset?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 rounded-xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs font-mono pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 font-mono text-xs text-rose-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:scale-[1.01] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500 font-mono">
            New to Anuvaad?{" "}
            <Link
              href="/signup"
              className="font-bold text-amber-400 hover:text-amber-300 transition-colors"
            >
              Create an account
            </Link>
          </p>

          <p className="mt-4 text-center text-[10px] font-mono text-slate-600">
            Encrypted session conforming to RFC 8446 (TLS 1.3).{" "}
            <Link href="/privacy" className="underline hover:text-slate-400">
              Zero Code Retention RFC
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return <SignInPageContent />;
}
