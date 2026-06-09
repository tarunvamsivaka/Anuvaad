"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import { Loader2, Eye, EyeOff, ArrowRight, Code2, Zap, Shield } from "lucide-react";
import { Logo } from "@/components/landing/Logo";

// Mini typewriter for auth left panel
const CODE_EXAMPLES = [
  { lang: "Python", code: `def fibonacci(n):\n  if n <= 1:\n    return n\n  return fibonacci(n-1)\n       + fibonacci(n-2)`, result: "Returns the nth Fibonacci number using elegant recursion." },
  { lang: "SQL", code: `SELECT u.name, COUNT(*)\nFROM users u\nJOIN orders o ON u.id = o.user_id\nGROUP BY u.name\nHAVING COUNT(*) > 5`, result: "Lists users with more than 5 orders, joined across tables." },
  { lang: "Rust", code: `fn main() {\n  let mut v: Vec<i32> = vec![3,1,4];\n  v.sort();\n  println!("{:?}", v);\n}`, result: "Sorts a vector of integers in ascending order and prints it." },
];

function AuthTypewriter() {
  const [exIdx, setExIdx] = useState(0);
  const [codeText, setCodeText] = useState("");
  const [resultText, setResultText] = useState("");
  const [phase, setPhase] = useState<"typing" | "revealing" | "pause">("typing");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let ci = 0;
    let ri = 0;
    const ex = CODE_EXAMPLES[exIdx];

    function typeCode() {
      if (ci < ex.code.length) {
        ci++;
        setCodeText(ex.code.slice(0, ci));
        timer = setTimeout(typeCode, 20);
      } else {
        setPhase("revealing");
        timer = setTimeout(typeResult, 400);
      }
    }
    function typeResult() {
      if (ri < ex.result.length) {
        ri++;
        setResultText(ex.result.slice(0, ri));
        timer = setTimeout(typeResult, 18);
      } else {
        setPhase("pause");
        timer = setTimeout(() => {
          setExIdx((i) => (i + 1) % CODE_EXAMPLES.length);
          setCodeText("");
          setResultText("");
          setPhase("typing");
          ci = 0;
          ri = 0;
          timer = setTimeout(typeCode, 300);
        }, 3500);
      }
    }

    setCodeText("");
    setResultText("");
    setPhase("typing");
    timer = setTimeout(typeCode, 600);
    return () => clearTimeout(timer);
   
  }, [exIdx]);

  const ex = CODE_EXAMPLES[exIdx];

  return (
    <div className="w-full max-w-md">
      {/* Demo card */}
      <div className="glass-amber rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.8)] border border-amber-500/15">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/10 bg-black/30">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-amber-400/70 uppercase tracking-widest border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded">
              {ex.lang}
            </span>
            <span className="text-[10px] font-mono text-slate-500">Code → English</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-mono text-amber-400/60 uppercase tracking-widest">
              {phase === "typing" ? "Reading..." : phase === "revealing" ? "Translating..." : "Done"}
            </span>
          </div>
        </div>

        {/* Code */}
        <div className="bg-[#030010]/60 p-4 border-b border-amber-500/8">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600 mb-2">Source Code</p>
          <pre className="font-mono text-xs text-slate-300 whitespace-pre min-h-[80px] leading-relaxed">
            {codeText}
            {phase === "typing" && (
              <span className="inline-block h-3 w-0.5 bg-amber-400 ml-0.5 align-middle" style={{ animation: "caret-blink 0.8s step-end infinite" }} />
            )}
          </pre>
        </div>

        {/* Result */}
        <div className="p-4 bg-black/20 min-h-[72px]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-500/50 mb-2">Plain English</p>
          {resultText && (
            <p className="text-xs text-slate-300 leading-relaxed italic" style={{ fontFamily: "Georgia, serif" }}>
              {resultText}
              {phase === "revealing" && (
                <span className="inline-block h-3 w-0.5 bg-amber-400 ml-0.5 align-middle" style={{ animation: "caret-blink 0.8s step-end infinite" }} />
              )}
            </p>
          )}
        </div>
      </div>

      {/* Trust features */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
          { icon: Code2, label: "35+ Languages" },
          { icon: Zap, label: "Instant Results" },
          { icon: Shield, label: "Secure & Private" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2 rounded-xl border border-amber-500/10 bg-amber-500/4 px-3 py-3 text-center">
            <Icon className="h-4 w-4 text-amber-500/70" />
            <span className="text-[10px] font-semibold text-slate-400 leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignInPageContent() {
  const searchParams = useSearchParams();
  const { signInWithEmail, signInWithGoogle, signInWithGitHub } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const rawRedirect = searchParams.get("redirectTo") || "/dashboard";
  const redirectTo = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) {
      setError("Authentication failed. Please check your inputs.");
      return;
    }
    setError("");
    setLoading(true);
    track("signin_attempted", { method: "email" });
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 500);
    }
  }

  async function handleGoogle() {
    track("signin_attempted", { method: "google" });
    const { error } = await signInWithGoogle();
    if (error) setError(error);
  }

  async function handleGitHub() {
    track("signin_attempted", { method: "github" });
    const { error } = await signInWithGitHub();
    if (error) setError(error);
  }

  return (
    <div className="auth-bg flex min-h-screen">
      {/* Left panel — dark demo */}
      <div className="hidden lg:flex lg:w-[55%] flex-col items-center justify-center p-12 relative border-r border-amber-500/8">
        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.03) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 w-full max-w-md text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Link href="/">
              <Logo showText iconSize={28} textSize="text-lg" />
            </Link>
          </div>

          <h2 className="mb-3 text-2xl font-bold text-white">
            Every Codebase Has a Story.
          </h2>
          <p className="mb-10 text-sm text-slate-400 leading-relaxed">
            Anuvaad translates code into plain English — and your ideas back into code.
          </p>

          <AuthTypewriter />
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
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="mt-1.5 text-sm text-slate-400">Sign in to your account to continue.</p>
          </div>

          {/* OAuth buttons */}
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
              <span className="px-3 bg-transparent text-slate-500">or sign in with email</span>
            </div>
          </div>

          {/* Email form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Honeypot */}
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
              <label htmlFor="signin-email" className="block text-xs font-medium text-slate-400 mb-1.5">Email address</label>
              <Input
                id="signin-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/20 text-sm"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="signin-password" className="text-xs font-medium text-slate-400">Password</label>
                <Link href="/forgot-password" className="text-xs text-amber-500/80 hover:text-amber-400 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/20 text-sm pr-10"
                  required
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
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
              ) : (
                <><ArrowRight className="h-4 w-4" /> Sign In</>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-amber-500/80 hover:text-amber-400 transition-colors">
              Sign up free
            </Link>
          </p>

          <p className="mt-4 text-center text-[10px] text-slate-600">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-slate-400 transition-colors">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-slate-400 transition-colors">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="auth-bg flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    }>
      <SignInPageContent />
    </Suspense>
  );
}
