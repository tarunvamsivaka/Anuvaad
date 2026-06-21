import { Metadata } from "next";
import LandingWrapper from "@/components/landing/LandingWrapper";
import Script from "next/script";

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
  // Default to true unless explicitly disabled via environment variable
  const showLandingV2 = process.env.NEXT_PUBLIC_LANDING_V2 !== "false";

  return (
    <>
      <Script
        id="schema-org-web-app"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingWrapper showLandingV2={showLandingV2} />
    </>
  );
}

