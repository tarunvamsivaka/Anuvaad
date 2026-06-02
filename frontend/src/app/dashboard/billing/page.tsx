"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Zap, CreditCard, ExternalLink, Loader2, X, PartyPopper } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { useSubscriptionStatus, useTranslationStats, useCredits } from "@/lib/hooks";
import Script from "next/script";

interface PortalInfo {
  subscription_id: string;
  plan: string;
  status: string;
  message: string;
}

function BillingPageContent() {
  const { isPro, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [creditLoading, setCreditLoading] = useState(false);
  const searchParams = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<"success" | "cancel" | null>(null);
  const [portalInfo, setPortalInfo] = useState<PortalInfo | null>(null);

  const { subscription } = useSubscriptionStatus(session?.access_token);
  const { stats, isLoading: statsLoading } = useTranslationStats(session?.user?.email, session?.access_token);
  const { credits, isLoading: creditsLoading } = useCredits(session?.access_token);

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success" || payment === "cancel") {
      requestAnimationFrame(() => {
        setPaymentStatus(payment);
      });
      // Clear the query param from URL without reload
      window.history.replaceState({}, "", "/dashboard/billing");
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          setPaymentStatus(null);
        });
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  async function handleUpgrade() {
    if (!session?.access_token || !session?.user?.email) return;
    setLoading(true);
    track("upgrade_clicked", { current_plan: isActuallyPro ? "pro" : "free", target_plan: "pro" });
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
        
        // Open Razorpay Checkout modal
        const options = {
          key: data.key_id,
          subscription_id: data.subscription_id,
          name: data.name,
          description: data.description,
          prefill: {
            email: session.user.email,
          },
          theme: {
            color: "#d97706", // amber-600
          },
          handler: async function (response: any) {
            setLoading(true);
            try {
              const verifyRes = await fetch(`${API}/api/verify-payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_subscription_id: response.razorpay_subscription_id || data.subscription_id,
                  razorpay_signature: response.razorpay_signature,
                  access_token: session.access_token,
                  payment_type: "subscription",
                }),
              });
              if (verifyRes.ok) {
                toast.success("Payment verified! Welcome to Pro.");
                window.location.href = "/dashboard/billing?payment=success";
              } else {
                const err = await verifyRes.json().catch(() => null);
                toast.error(err?.detail || "Payment verification failed. Please contact support.");
              }
            } catch {
              toast.error("Could not connect to payment verification service.");
            } finally {
              setLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            }
          }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.detail || "Failed to create checkout session.");
        setLoading(false);
      }
    } catch {
      toast.error("Could not connect to billing service. Please try again.");
      setLoading(false);
    }
  }

  async function handleManageBilling() {
    if (!session?.access_token) return;
    setPortalLoading(true);
    track("portal_opened", {});
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/create-portal-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: session.access_token }),
      });
      if (res.ok) {
        const data = await res.json();
        setPortalInfo(data);
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.detail || "Could not retrieve subscription details.");
      }
    } catch {
      toast.error("Could not connect to billing service. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleBuyCredits() {
    if (!session?.access_token) return;
    setCreditLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/create-credit-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: session.access_token }),
      });
      if (res.ok) {
        const data = await res.json();
        
        // Open Razorpay Checkout modal for order payment
        const options = {
          key: data.key_id,
          amount: data.amount,
          currency: data.currency,
          name: data.name,
          description: data.description,
          order_id: data.order_id,
          prefill: {
            email: session.user.email || "",
          },
          theme: {
            color: "#d97706", // amber-600
          },
          handler: async function (response: any) {
            setCreditLoading(true);
            try {
              const verifyRes = await fetch(`${API}/api/verify-payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id || data.order_id,
                  razorpay_signature: response.razorpay_signature,
                  access_token: session.access_token,
                  payment_type: "credits",
                }),
              });
              if (verifyRes.ok) {
                toast.success("Credits added successfully!");
                window.location.reload();
              } else {
                const err = await verifyRes.json().catch(() => null);
                toast.error(err?.detail || "Credits verification failed. Please contact support.");
              }
            } catch {
              toast.error("Could not verify credits. Please contact support.");
            } finally {
              setCreditLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              setCreditLoading(false);
            }
          }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.detail || "Could not open credit checkout.");
        setCreditLoading(false);
      }
    } catch {
      toast.error("Could not connect to billing service. Please try again.");
      setCreditLoading(false);
    }
  }

  const isActuallyPro = isPro || subscription?.plan === "pro";
  const limit = 10;
  const usageCount = stats?.today || 0;
  const usagePercentage = Math.min((usageCount / limit) * 100, 100);

  return (
    <div className="min-h-screen">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
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
                <h2 className="text-lg font-semibold">{isActuallyPro ? "Pro Plan" : "Free Plan"}</h2>
                <Badge variant="secondary" className="text-[10px]">{subscription?.status === "active" ? "Active" : "Current"}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isActuallyPro ? "Unlimited translations · Priority processing · 50K char inputs" : "10 translations per day · 35+ languages · All modes"}
              </p>
              {subscription?.current_period_end && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            <p className="text-3xl font-bold">
              {isActuallyPro ? "₹499" : "₹0"}<span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
          </div>
          {!isActuallyPro && (
            <>
              <Separator className="my-6" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Usage this billing period</p>
                  <p className="mt-1 text-xs text-muted-foreground">Daily limit resets at midnight UTC</p>
                </div>
                {statsLoading ? (
                  <Skeleton className="h-2 w-32 rounded-full" />
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{usageCount} / {limit} used</span>
                    <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-amber-600 transition-all duration-500" style={{ width: `${usagePercentage}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>

        {/* Upgrade section — only show for free users */}
        {!isActuallyPro && (
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
                {loading ? "Opening Checkout..." : "Upgrade — ₹499/month"}
              </Button>
            </div>
          </Card>
        )}

        {/* Pro success state */}
        {isActuallyPro && (
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

        {/* Credits section */}
        <Card className="mt-6 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Translation Credits</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                One-time purchase credits for when you hit your free tier limits.
              </p>
            </div>
            <div className="text-right">
              {creditsLoading ? (
                <Skeleton className="h-8 w-16 mb-1 ml-auto" />
              ) : (
                <p className="text-3xl font-bold text-amber-600">{credits}</p>
              )}
              <span className="text-xs font-normal text-muted-foreground">Available</span>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Buy more credits</p>
              <p className="mt-1 text-xs text-muted-foreground">Never expire. Use anytime.</p>
            </div>
            <Button onClick={handleBuyCredits} disabled={creditLoading} variant="outline" className="gap-2">
              {creditLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-amber-600" />}
              {creditLoading ? "Processing..." : "Buy 100 Credits — ₹100"}
            </Button>
          </div>
        </Card>

        {/* Payment method */}
        <Card className="mt-6 p-6">
          <h2 className="text-sm font-semibold">Payment Method</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isActuallyPro ? "Managed via Razorpay." : "No payment method on file."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-2 text-xs"
            onClick={handleManageBilling}
            disabled={portalLoading || !isActuallyPro}
          >
            {portalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
            {portalLoading ? "Retrieving..." : "Manage Subscription"}
          </Button>
        </Card>
      </div>

      {/* Subscription details / self-service cancellation instructions modal */}
      {portalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <Card className="w-full max-w-md p-6 relative border-border/80 bg-popover text-popover-foreground shadow-2xl">
            <button 
              onClick={() => setPortalInfo(null)} 
              className="absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-600" />
              Subscription Details
            </h3>
            <Separator className="my-4" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium uppercase text-amber-600">{portalInfo.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium capitalize text-emerald-600">{portalInfo.status}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Subscription ID:</span>
                <span className="font-mono text-[11px] select-all bg-muted px-2 py-1.5 rounded break-all">{portalInfo.subscription_id}</span>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded p-3 leading-relaxed">
              {portalInfo.message}
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setPortalInfo(null)} size="sm">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  );
}
