"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check, Zap, CreditCard, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function BillingPage() {
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
                <h2 className="text-lg font-semibold">Free Plan</h2>
                <Badge variant="secondary" className="text-[10px]">Current</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">10 translations per day · 7 languages · All modes</p>
            </div>
            <p className="text-3xl font-bold">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          </div>
          <Separator className="my-6" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Usage this billing period</p>
              <p className="mt-1 text-xs text-muted-foreground">3 of 10 daily translations used</p>
            </div>
            <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-[30%] rounded-full bg-amber-600" />
            </div>
          </div>
        </Card>

        {/* Upgrade section */}
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
            <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
              <CreditCard className="h-4 w-4" /> Upgrade — $12/month
            </Button>
            <span className="text-xs text-muted-foreground">or $96/year (save 33%)</span>
          </div>
        </Card>

        {/* Payment method */}
        <Card className="mt-6 p-6">
          <h2 className="text-sm font-semibold">Payment Method</h2>
          <p className="mt-2 text-sm text-muted-foreground">No payment method on file.</p>
          <Button variant="outline" size="sm" className="mt-4 gap-2 text-xs">
            <ExternalLink className="h-3 w-3" /> Manage in Stripe
          </Button>
        </Card>
      </div>
    </div>
  );
}
