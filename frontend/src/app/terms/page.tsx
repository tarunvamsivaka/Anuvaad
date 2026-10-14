import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/landing/Logo";
import { CurrentQuotaRows } from "@/components/legal/CurrentQuotaRows";

export const metadata: Metadata = {
  title: "Terms of Service — Anuvaad",
  description: "Usage rules, payment terms, and policies for using Anuvaad.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-6">
          <Link href="/" className="block">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: October 2026</p>

        <div className="mt-12 space-y-10 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">1. Service Description</h2>
            <p>Anuvaad is an AI-powered code translation tool. We provide three modes: Code → English, English → Code, and Code → Code. The service uses Groq and DeepSeek AI for translations.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">2. Plans & Pricing</h2>
            <div className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-foreground">
              <strong>NOTICE:</strong> Billing and payment registration are temporarily paused during our launch phase. Users can enjoy the complimentary free tier and onboarding template features without charge.
            </div>
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left">
                <thead><tr className="border-b border-border bg-muted/50"><th className="px-4 py-2.5 text-xs font-semibold text-foreground">Plan</th><th className="px-4 py-2.5 text-xs font-semibold text-foreground">Price</th><th className="px-4 py-2.5 text-xs font-semibold text-foreground">Limit</th></tr></thead>
                <CurrentQuotaRows />
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">3. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Use the service to process malicious code or generate harmful content.</li>
              <li>Circumvent rate limits or abuse the API.</li>
              <li>Resell or redistribute translations commercially without permission.</li>
              <li>Attempt to reverse engineer the backend infrastructure.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">4. Intellectual Property</h2>
            <p><strong className="text-foreground">Your code remains yours.</strong> We claim no ownership over input or output. Translations are provided as-is. Anuvaad is open source under the MIT License.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">5. Refund Policy</h2>
            <p>Paid subscriptions and payment registration are currently paused, so no subscription charges or refunds are being processed. If paid plans become available, the applicable billing and refund terms will be shown before purchase.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">6. Limitation of Liability</h2>
            <p>Anuvaad is provided &quot;as is&quot; without warranties. We are not responsible for inaccurate translations, data loss, or service interruptions. AI-generated output should always be reviewed before use in production.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">7. Changes</h2>
            <p>We may update these terms. Significant changes will be communicated via email to registered users. Continued use after changes constitutes acceptance.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
