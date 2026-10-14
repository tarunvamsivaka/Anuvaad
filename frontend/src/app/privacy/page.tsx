import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/landing/Logo";

export const metadata: Metadata = {
  title: "Privacy Policy — Anuvaad",
  description: "How Anuvaad handles your data, what we collect, and your rights.",
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: October 2026</p>

        <div className="mt-12 space-y-10 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">1. What We Collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong className="text-foreground">Account information:</strong> Email address and authentication provider (Google, GitHub, or email/password).</li>
              <li><strong className="text-foreground">Usage data:</strong> Translation count, mode used, and timestamps for rate limiting.</li>
              <li><strong className="text-foreground">Payment data:</strong> Paid plans are currently unavailable. If payments are introduced, this policy will be updated before checkout is enabled.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">2. Code Processing</h2>
            <p>Translation requests send the code or prompt you submit to Anuvaad’s API and to the AI provider selected for that request. AI providers process those requests under their own terms and retention practices; Anuvaad does not control provider-side retention. In the translation workspace, runs are not written to Anuvaad history or translation cache unless you sign in and enable “Save runs to my Anuvaad history and translation cache.” You can delete saved history from the History page, including all saved runs. A translation is visible to others only after you explicitly create a share link. This workspace setting does not control network, hosting, diagnostic, or provider logs, and we do not promise zero retention across those services.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">3. Third-Party Services</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong className="text-foreground">Supabase:</strong> Authentication and database hosting.</li>
              <li><strong className="text-foreground">AI providers:</strong> Providers such as Groq and DeepSeek process code or prompts to generate translations. The provider used may vary by request.</li>
              <li><strong className="text-foreground">PostHog:</strong> Product usage and behavior analytics to help us improve the platform experience.</li>
              <li><strong className="text-foreground">Sentry:</strong> Real-time error monitoring and application performance diagnostics.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">4. Cookies and Local Storage</h2>
            <p>We use browser storage for authentication. Product analytics and error monitoring may collect usage events, device or session identifiers, and diagnostic data. We configure analytics to avoid sending source code, prompts, or generated code; avoid including sensitive content in support requests or error reports.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">5. Your Rights</h2>
            <p>You can delete saved translation history and request account deletion from Settings. Deletion may take time to propagate to backups, logs, and third-party services, and some records may be retained where required for security or legal reasons. For data access or export requests, contact us through the project’s GitHub page.</p>
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
