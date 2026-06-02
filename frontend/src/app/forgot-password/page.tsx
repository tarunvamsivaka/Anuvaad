"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/signin`,
      });
      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-sm font-bold text-white">A</div>
            <span className="text-lg font-semibold tracking-tight">Anuvaad</span>
          </Link>
        </div>

        <Card className="p-6">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600/10">
                <Mail className="h-6 w-6 text-emerald-600" />
              </div>
              <h1 className="mt-4 text-lg font-semibold">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset your password.
              </p>
              <Link href="/signin">
                <Button variant="outline" className="mt-6 w-full gap-2 text-sm">
                  <ArrowLeft className="h-4 w-4" /> Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold">Reset your password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="forgot-email" className="text-xs font-medium text-muted-foreground">Email</label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 text-sm"
                    required
                    autoFocus
                  />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-sm" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Remember your password?{" "}
                <Link href="/signin" className="font-medium text-amber-600 hover:text-amber-700">Sign In</Link>
              </p>
            </>
          )}
        </Card>

        <p className="mt-6 text-center text-[10px] text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline">Terms</Link> and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
