"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check, Zap, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";

export default function BillingPage() {
  const { isPro, session } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session?.user?.email,
          success_url: `${window.location.origin}/dashboard/billing?success=true`,
          cancel_url: `${window.location.origin}/dashboard/billing?canceled=true`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      }
    } catch {
      // Silently fail
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
                {isPro ? "Unlimited translations · Priority processing · 50K char inputs" : "10 translations per day · 7 languages · All modes"}
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
