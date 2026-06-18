"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Zap, CreditCard, Loader2, X, PartyPopper } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { useSubscriptionStatus, useTranslationStats } from "@/lib/hooks";
import Script from "next/script";

function BillingPageContent() {
  const router = useRouter();
  const { isPro, session } = useAuth();
  const [loading, setLoading] = useState(false);
  // const [portalLoading, setPortalLoading] = useState(false);
  // const [creditLoading, setCreditLoading] = useState(false);
  const searchParams = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<"success" | "cancel" | null>(null);

  const { subscription } = useSubscriptionStatus(session?.access_token);
  const { stats, isLoading: statsLoading } = useTranslationStats(session?.user?.email, session?.access_token);
  // const { credits, isLoading: creditsLoading } = useCredits(session?.access_token);

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

  const enableBilling = process.env.NEXT_PUBLIC_ENABLE_BILLING === "true";

  async function handleUpgrade() {
    if (!enableBilling) {
      toast.info("Upgrades are temporarily paused during our launch. Enjoy all features!");
      return;
    }
    if (!session?.access_token || !session?.user?.email) return;
    setLoading(true);
    track("upgrade_clicked", { current_plan: isActuallyPro ? "pro" : "free", target_plan: "pro" });
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/create-checkout-session`, {
        method: "POST",
        // BACK-06: auth via Authorization header, not request body
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_email: session.user.email,
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
            color: "#f5a623", // bright amber-glow
          },
          handler: async function (response: any) {
            setLoading(true);
            try {
              const verifyRes = await fetch(`${API}/api/verify-payment`, {
                method: "POST",
                // BACK-06: auth via Authorization header, not request body
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_subscription_id: response.razorpay_subscription_id || data.subscription_id,
                  razorpay_signature: response.razorpay_signature,
                  payment_type: "subscription",
                }),
              });
              if (verifyRes.ok) {
                toast.success("Payment verified! Welcome to Pro.");
                // FRONT-05: Use router.push instead of window.location.href
                // This preserves SPA navigation and allows SWR to revalidate.
                router.push("/dashboard/billing?payment=success");
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

  /*
  async function handleManageBilling() {
    if (!enableBilling) {
      toast.info("Subscription management is currently offline since billing is paused.");
      return;
    }
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
    if (!enableBilling) {
      toast.info("Credit purchases are temporarily paused during our launch.");
      return;
    }
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
            color: "#f5a623", // bright amber-glow
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
  */

  const isActuallyPro = isPro || subscription?.plan === "pro";
  const limit = 10;
  const usageCount = stats?.today || 0;
  const usagePercentage = Math.min((usageCount / limit) * 100, 100);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface-low text-slate-900 dark:text-slate-100 pb-20">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      {/* Page Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-amber-600/10 bg-white/80 dark:bg-surface-low/80 backdrop-blur-md">
        <div className="flex h-16 items-center pl-14 pr-8 md:px-8 max-w-4xl mx-auto">
          <h1 className="text-base font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Billing & Licenses
          </h1>
        </div>
      </header>

      {/* Payment status banner */}
      {paymentStatus && (
        <div className="mx-auto max-w-4xl px-8 pt-6">
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-xs uppercase tracking-wider font-bold animate-in fade-in slide-in-from-top-2 ${
            paymentStatus === "success"
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
              : "border-amber-500/30 bg-amber-500/5 text-amber-400"
          }`}>
            {paymentStatus === "success" ? (
              <>
                <PartyPopper className="h-5 w-5 shrink-0 text-emerald-400" />
                <div className="flex-1">
                  <p className="font-extrabold text-emerald-400">Payment Verified!</p>
                  <p className="text-[10px] text-slate-400 lowercase mt-0.5">Welcome to Pro. Unlimited translations unlocked.</p>
                </div>
              </>
            ) : (
              <>
                <X className="h-5 w-5 shrink-0 text-amber-500" />
                <div className="flex-1">
                  <p className="font-extrabold text-amber-400">Transaction Terminated</p>
                  <p className="text-[10px] text-slate-400 lowercase mt-0.5">No changes were applied. You may retry when ready.</p>
                </div>
              </>
            )}
            <button onClick={() => setPaymentStatus(null)} className="shrink-0 rounded p-1 hover:bg-white/5">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-8 py-8 space-y-8">
        
        {/* Current plan card */}
        <Card className="p-6 bg-white dark:bg-surface-charcoal/80 border border-slate-200 dark:border-amber-600/10 rounded-xl shadow-md dark:shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {isActuallyPro ? "Pro Subscription" : "Sandbox Level Plan"}
                </h2>
                <Badge className="text-[9px] uppercase tracking-widest bg-amber-500 text-slate-950 font-bold px-2 py-0.5">
                  {subscription?.status === "active" ? "Active" : "Current"}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                {isActuallyPro 
                  ? "Infinite code compilations, prioritized CPU routing, 50,000 character buffer capacity, and early release features." 
                  : "Standard sandbox plan loaded with 10 translations daily, full programming dictionary access, and 3 code translation modes."
                }
              </p>
              {subscription?.current_period_end && (
                <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  • System auto-renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-left sm:text-right shrink-0">
              <p className="text-3xl font-black text-amber-500">
                {isActuallyPro ? "₹499" : "₹0"}
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-normal">/mo</span>
              </p>
            </div>
          </div>

          {!isActuallyPro && (
            <>
              <Separator className="my-6 bg-slate-200 dark:bg-slate-800/50" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sandbox Daily Counter</p>
                  <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">Limits reset daily at midnight (UTC +0)</p>
                </div>
                {statsLoading ? (
                  <Skeleton className="h-2 w-36 bg-slate-200 dark:bg-slate-900 rounded-full" />
                ) : (
                  <div className="flex flex-col items-end gap-1.5 w-full sm:w-auto">
                    <span className="text-[11px] font-bold text-amber-500">{usageCount} / {limit} queries</span>
                    <div className="h-2 w-full sm:w-36 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-900">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-500 shadow-[0_0_6px_rgba(245,158,11,0.3)]" style={{ width: `${usagePercentage}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>

        {/* Upgrade section — only show for free users */}
        {!isActuallyPro && (
          <Card className="border border-slate-200 dark:border-amber-600/20 bg-white dark:bg-gradient-to-r dark:from-amber-950/15 dark:via-[#0c0c0f] dark:to-amber-950/5 p-6 rounded-xl shadow-md dark:shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-2.5 mb-3">
              <Zap className="h-5 w-5 text-amber-500 animate-pulse" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500">Redeem Pro Access</h2>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
              Break past limits. Deploy a continuous translation harness using on-demand remote pipelines.
            </p>
            
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Unlimited compiler pipelines",
                "Prioritized pipeline routing (<3s)",
                "Expanded 50,000 char capacity",
                "Persistent history cache integration",
                "Advanced AI models selection",
                "Direct continuous support"
              ].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <Check className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-6 space-y-3">
              <Button 
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 hover:text-slate-950 font-bold uppercase tracking-wider text-xs gap-2 h-10 px-5 shadow-[0_0_12px_rgba(245,158,11,0.2)]" 
                onClick={handleUpgrade} 
                disabled={loading || !enableBilling}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {loading ? "Allocating Gateway..." : enableBilling ? "Activate Pro — ₹499/Month" : "Subscriptions Paused"}
              </Button>
              {!enableBilling && (
                <p className="text-[10px] text-amber-500/70 italic font-medium leading-relaxed max-w-md">
                  * Live subscription checkout is offline. All pro functions are enabled natively for testing cycles.
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Pro success card */}
        {isActuallyPro && (
          <Card className="border border-emerald-500/20 bg-white dark:bg-gradient-to-r dark:from-emerald-950/15 dark:via-[#0c0c0f] dark:to-emerald-950/5 p-6 rounded-xl shadow-md dark:shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-2.5">
              <Check className="h-5 w-5 text-emerald-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Pro Pipeline Active</h2>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
              Your profile is authenticated to run unlimited model queries, with direct GPU allocation and cloud history archiving active.
            </p>
          </Card>
        )}

      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-full items-center justify-center bg-surface-base">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  );
}
