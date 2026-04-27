import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anuvaad — Understand Any Codebase Instantly",
  description:
    "AI-powered code explanations, reverse engineering, and code translation. Supports 35+ languages including Python, JavaScript, Java, C++, TypeScript, Rust, Go, Swift, Kotlin, SQL, and more.",
  metadataBase: new URL("https://anuvaad.dev"),
  keywords: [
    "code translator",
    "code to english",
    "AI code explainer",
    "code translation",
    "reverse engineering",
    "python to javascript",
    "code to code",
    "programming language translator",
    "code documentation generator",
    "gemini code",
  ],
  openGraph: {
    title: "Anuvaad — AI Code Translator",
    description:
      "Translate code to plain English and back. 35+ languages supported. Understand any codebase instantly.",
    type: "website",
    url: "https://anuvaad.dev",
    siteName: "Anuvaad",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anuvaad — AI Code Translator",
    description:
      "Translate code to plain English and back. 35+ languages including Python, JavaScript, Java, C++, and more.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
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
      priceCurrency: "USD",
      name: "Free Plan",
      description: "10 translations per day, 35+ languages",
    },
    {
      "@type": "Offer",
      price: "12",
      priceCurrency: "USD",
      name: "Pro Plan",
      description: "Unlimited translations, priority processing",
    },
  ],
  featureList: [
    "Code to English translation",
    "English to Code generation",
    "Code to Code translation",
    "35+ programming languages",
    "Team workspaces",
    "API access",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ThemeProvider>
          <TooltipProvider>
            <AuthProvider>{children}</AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

