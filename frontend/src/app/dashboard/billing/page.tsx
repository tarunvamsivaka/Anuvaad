"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check, Zap, CreditCard, ExternalLink, Loader2, X, PartyPopper } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function BillingPage() {
  const { isPro, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<"success" | "cancel" | null>(null);

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success" || payment === "cancel") {
      setPaymentStatus(payment);
      // Clear the query param from URL without reload
      window.history.replaceState({}, "", "/dashboard/billing");
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => setPaymentStatus(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  async function handleUpgrade() {
    if (!session?.access_token || !session?.user?.email) return;
    setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: session.user.email,
          access_token: session.access_token,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } else {
        const err = await res.json().catch(() => null);
        console.error("Checkout failed:", err?.detail || res.status);
      }
    } catch (e) {
      console.error("Checkout error:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center px-6">
          <h1 className="text-lg font-semibold">Billing</h1>
        </div>
      </header>

      {/* Payment status banner */}
      {paymentStatus && (
        <div className={`mx-auto max-w-3xl px-6 pt-4`}>
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm animate-in fade-in slide-in-from-top-2 ${
            paymentStatus === "success"
              ? "border-emerald-600/30 bg-emerald-600/5 text-emerald-700 dark:text-emerald-400"
              : "border-amber-600/30 bg-amber-600/5 text-amber-700 dark:text-amber-400"
          }`}>
            {paymentStatus === "success" ? (
              <>
                <PartyPopper className="h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">Payment successful!</p>
                  <p className="text-xs opacity-80">Welcome to Pro. Your subscription is now active.</p>
                </div>
              </>
            ) : (
              <>
                <X className="h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">Payment cancelled</p>
                  <p className="text-xs opacity-80">No charges were made. You can upgrade anytime.</p>
                </div>
              </>
            )}
            <button onClick={() => setPaymentStatus(null)} className="shrink-0 rounded p-1 hover:bg-black/5 dark:hover:bg-white/5">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl p-6">
        {/* Current plan */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{isPro ? "Pro Plan" : "Free Plan"}</h2>
                <Badge variant="secondary" className="text-[10px]">Current</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isPro ? "Unlimited translations · Priority processing · 50K char inputs" : "10 translations per day · 35+ languages · All modes"}
              </p>
            </div>
            <p className="text-3xl font-bold">
              {isPro ? "$12" : "$0"}<span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
          </div>
          {!isPro && (
            <>
              <Separator className="my-6" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Usage this billing period</p>
                  <p className="mt-1 text-xs text-muted-foreground">Daily limit resets at midnight UTC</p>
                </div>
                <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[30%] rounded-full bg-amber-600 transition-all" />
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Upgrade section — only show for free users */}
        {!isPro && (
          <Card className="mt-6 border-amber-600/20 bg-gradient-to-r from-amber-600/5 to-amber-500/5 p-6">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold">Upgrade to Pro</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Unlock unlimited translations, priority processing, and large inputs.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {["Unlimited translations","Priority processing","50K char inputs","Cloud-synced history","Early access to features","Email support"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-amber-600 shrink-0" />{f}
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-4">
              <Button className="gap-2 bg-amber-600 hover:bg-amber-700" onClick={handleUpgrade} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {loading ? "Redirecting..." : "Upgrade — $12/month"}
              </Button>
              <span className="text-xs text-muted-foreground">or $96/year (save 33%)</span>
            </div>
          </Card>
        )}

        {/* Pro success state */}
        {isPro && (
          <Card className="mt-6 border-emerald-600/20 bg-gradient-to-r from-emerald-600/5 to-emerald-500/5 p-6">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold">You&apos;re on Pro</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Enjoy unlimited translations, priority processing, and all premium features.
            </p>
          </Card>
        )}

        {/* Payment method */}
        <Card className="mt-6 p-6">
          <h2 className="text-sm font-semibold">Payment Method</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isPro ? "Managed via Stripe." : "No payment method on file."}
          </p>
          <Button variant="outline" size="sm" className="mt-4 gap-2 text-xs">
            <ExternalLink className="h-3 w-3" /> Manage in Stripe
          </Button>
        </Card>
      </div>
    </div>
  );
}
