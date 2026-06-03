import { Metadata } from "next";
import Script from "next/script";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { UseCases } from "@/components/landing/use-cases";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { WebGLScrollProvider } from "@/components/landing/WebGLScrollProvider";

export const metadata: Metadata = {
  title: "Anuvaad — The AI Code Translator for Modern Teams",
  description: "Stop struggling with legacy code. Anuvaad instantly translates obscure logic into plain English or generates perfect code from your human specifications.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Anuvaad",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description: "AI-powered code translator that converts code to plain English and back. Supports 35+ programming languages.",
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
      
      {/* 3D WebGL background + GSAP Scroll animations (loaded client-side) */}
      <WebGLScrollProvider />

      <div className="relative z-10 flex min-h-screen flex-col overflow-hidden bg-transparent text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
        <Navbar />
        
        <main className="flex-1">
          {/* Main sections structured with IDs for smooth scroll snapping */}
          <div id="hero" className="w-full">
            <Hero />
          </div>
          
          <div id="features" className="w-full">
            <Features />
          </div>
          
          <div id="how-it-works" className="w-full">
            <HowItWorks />
            <UseCases />
          </div>
          
          <div id="pricing" className="w-full">
            <Pricing />
          </div>
          
          <div id="faq" className="w-full">
            <FAQ />
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
