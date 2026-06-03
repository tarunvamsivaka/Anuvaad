import { Metadata } from "next";
import Script from "next/script";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { ScrollStory } from "@/components/landing/ScrollStory";
import { TransformationDemo } from "@/components/landing/TransformationDemo";
import { Features } from "@/components/landing/features";
import { Positioning } from "@/components/landing/Positioning";
import { Trust } from "@/components/landing/Trust";
import { Testimonials } from "@/components/landing/testimonials";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { WebGLScrollProvider } from "@/components/landing/WebGLScrollProvider";

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

      {/* 3D WebGL particle background (loaded client-side) */}
      <WebGLScrollProvider />

      {/* Smooth scroll side-nav tracker */}
      <SmoothScroll />

      {/* The full landing page — dark obsidian background, all sections stack above WebGL */}
      <div
        className="relative z-10 flex min-h-screen flex-col text-slate-100 selection:bg-amber-500/30 selection:text-amber-200"
        style={{ background: "var(--landing-bg, #020204)" }}
      >
        <Navbar />

        <main className="flex-1">
          {/* 1. Cinematic Hero */}
          <div id="hero">
            <Hero />
          </div>

          {/* 2. The Scroll Story — Riya's narrative */}
          <div id="story">
            <ScrollStory />
          </div>

          {/* 3. Interactive 3-tab Demo */}
          <div id="demo">
            <TransformationDemo />
          </div>

          {/* 4. Feature Bento Grid */}
          <div id="features">
            <Features />
          </div>

          {/* 5. Positioning — cinematic philosophy section */}
          <Positioning />

          {/* 6. Trust & Security */}
          <Trust />

          {/* 7. Social Proof — infinite marquee */}
          <Testimonials />

          {/* 8. FAQ */}
          <div id="faq">
            <FAQ />
          </div>

          {/* 9. Final CTA */}
          <FinalCTA />
        </main>

        <Footer />
      </div>
    </>
  );
}
