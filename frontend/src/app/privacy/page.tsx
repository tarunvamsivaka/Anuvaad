import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Anuvaad",
  description: "How Anuvaad handles your data, what we collect, and your rights.",
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2026</p>

        <div className="mt-12 space-y-10 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">1. What We Collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong className="text-foreground">Account information:</strong> Email address and authentication provider (Google, GitHub, or email/password).</li>
              <li><strong className="text-foreground">Usage data:</strong> Translation count, mode used, and timestamps for rate limiting.</li>
              <li><strong className="text-foreground">Payment data:</strong> Managed entirely by Stripe. We never store card numbers.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">2. Code Processing</h2>
            <p>Your code is sent to our API for translation via Google&apos;s Gemini AI. <strong className="text-foreground">We do not store your code.</strong> It is processed in real-time and the result is returned immediately. No code snippets are logged or retained on our servers.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">3. Third-Party Services</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong className="text-foreground">Supabase:</strong> Authentication and database hosting.</li>
              <li><strong className="text-foreground">Google Gemini:</strong> AI model for code translation.</li>
              <li><strong className="text-foreground">Stripe:</strong> Payment processing for Pro subscriptions.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">4. Cookies</h2>
            <p>We use essential cookies for authentication session management (Supabase auth tokens). We do not use tracking cookies or third-party analytics cookies.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">5. Your Rights</h2>
            <p>You can delete your account at any time from Settings. This removes all associated data. For data export requests, contact us via GitHub.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">6. Contact</h2>
            <p>For privacy questions, open an issue on <a href="https://github.com/tarunvamsivaka/Anuvaad" className="font-medium text-amber-600 hover:text-amber-700 underline" target="_blank" rel="noopener noreferrer">GitHub</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
