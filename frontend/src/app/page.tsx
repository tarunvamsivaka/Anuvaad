import { Metadata } from "next";
import Script from "next/script";
import dynamic from "next/dynamic";
import {
  WisprNavbar,
  NavAnnouncementPill,
  HeroControlBar,
  EnterpriseSecurity,
  CustomerProof,
  ActionDeck,
  WisprFooter,
} from "@/components/landing/wispr";

// Dynamic imports with layout-preserving skeleton fallbacks to minimize initial bundle size and eliminate TBT
const LivePlayground = dynamic(
  () => import("@/components/landing/wispr/LivePlayground").then((mod) => mod.LivePlayground),
  {
    loading: () => (
      <div className="w-full h-[520px] rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 animate-pulse flex items-center justify-center">
        <span className="text-xs font-mono text-slate-400">Loading Interactive Playground...</span>
      </div>
    ),
  }
);

const GitPrWorkflowDemo = dynamic(
  () => import("@/components/landing/wispr/GitPrWorkflowDemo").then((mod) => mod.GitPrWorkflowDemo),
  {
    loading: () => (
      <div className="w-full h-[460px] rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 animate-pulse flex items-center justify-center">
        <span className="text-xs font-mono text-slate-400">Loading PR Workflow Simulator...</span>
      </div>
    ),
  }
);

const BenchmarkExplorer = dynamic(
  () => import("@/components/landing/wispr/BenchmarkExplorer").then((mod) => mod.BenchmarkExplorer),
  {
    loading: () => (
      <div className="w-full h-[480px] rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 animate-pulse flex items-center justify-center">
        <span className="text-xs font-mono text-slate-400">Loading Benchmark Explorer...</span>
      </div>
    ),
  }
);

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
        {/* Skip to Main Content Link for Keyboard & Screen Reader Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white dark:focus:bg-slate-900 focus:text-slate-900 dark:focus:text-white focus:border focus:border-slate-300 dark:focus:border-slate-700 focus:rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shadow-xl font-semibold text-xs"
        >
          Skip to main content
        </a>

        {/* Announcement Banner */}
        <NavAnnouncementPill />

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
