import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Anuvaad",
  description: "Usage rules, payment terms, and policies for using Anuvaad.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-6">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight">Anuvaad</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-600">Translator</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2026</p>

        <div className="mt-12 space-y-10 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">1. Service Description</h2>
            <p>Anuvaad is an AI-powered code translation tool. We provide three modes: Code → English, English → Code, and Code → Code. The service uses Google Gemini AI for translations.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">2. Plans & Pricing</h2>
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left">
                <thead><tr className="border-b border-border bg-muted/50"><th className="px-4 py-2.5 text-xs font-semibold text-foreground">Plan</th><th className="px-4 py-2.5 text-xs font-semibold text-foreground">Price</th><th className="px-4 py-2.5 text-xs font-semibold text-foreground">Limit</th></tr></thead>
                <tbody>
                  <tr className="border-b border-border"><td className="px-4 py-2.5">Free</td><td className="px-4 py-2.5">$0</td><td className="px-4 py-2.5">10/day</td></tr>
                  <tr className="border-b border-border"><td className="px-4 py-2.5">Pro</td><td className="px-4 py-2.5">$12/mo or $96/yr</td><td className="px-4 py-2.5">Unlimited</td></tr>
                  <tr><td className="px-4 py-2.5">Team</td><td className="px-4 py-2.5">$29/mo or $228/yr</td><td className="px-4 py-2.5">Unlimited + 5 seats</td></tr>
                </tbody>
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
            <p>Pro subscriptions can be cancelled at any time. We offer a 7-day refund window from the date of first payment. Contact us via GitHub to request a refund.</p>
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
