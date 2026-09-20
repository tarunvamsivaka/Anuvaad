import { Metadata } from "next";
import Script from "next/script";
import {
  WisprNavbar,
  HeroControlBar,
  LivePlayground,
  GitPrWorkflowDemo,
  BenchmarkExplorer,
  EnterpriseSecurity,
  CustomerProof,
  ActionDeck,
  WisprFooter,
} from "@/components/landing/wispr";

export const metadata: Metadata = {
  title: "Anuvaad — The AI Code Translator for Modern Teams",
  description:
    "Stop struggling with legacy code. Anuvaad instantly translates obscure logic into plain English or generates perfect code from your human specifications.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Anuvaad",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "AI-powered code translator that converts code to plain English and back. Supports 35+ programming languages.",
  url: "https://anuvaad.dev",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      name: "Free Plan",
      description: "10 translations per day, 35+ languages",
    },
    {
      "@type": "Offer",
      price: "499",
      priceCurrency: "INR",
      name: "Pro Plan",
      description: "Unlimited translations, priority processing",
    },
  ],
};

export default function Home() {
  return (
    <>
      <Script
        id="schema-org-web-app"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="relative min-h-screen w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans selection:bg-slate-900 selection:text-white dark:selection:bg-slate-100 dark:selection:text-slate-900 flex flex-col overflow-x-hidden">
        {/* Floating Pill Navigation */}
        <WisprNavbar />

        <main id="main-content" className="flex-1 w-full flex flex-col items-center">
          {/* Hero & Quick-Action Prompt Bar */}
          <HeroControlBar />

          {/* Core Product Modules */}
          <section id="playground" className="w-full py-16 px-4 md:px-8 max-w-7xl mx-auto">
            <LivePlayground />
          </section>

          <section id="workflow" className="w-full py-16 px-4 md:px-8 max-w-7xl mx-auto">
            <GitPrWorkflowDemo />
          </section>

          <section id="benchmarks" className="w-full py-16 px-4 md:px-8 max-w-7xl mx-auto">
            <BenchmarkExplorer />
          </section>

          {/* Enterprise Security & Governance */}
          <EnterpriseSecurity />

          {/* Customer Social Proof & Adoption */}
          <CustomerProof />

          {/* High-Conversion Action Deck */}
          <ActionDeck />
        </main>

        {/* Semantic Sitemap Footer */}
        <WisprFooter />
      </div>
    </>
  );
}
