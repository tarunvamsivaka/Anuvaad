import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Playfair_Display, Outfit, EB_Garamond } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { Toaster } from "sonner";
import "./globals.css";


const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",  // Prevent FOIT — show fallback font while Inter loads
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",  // Prevent FOIT
  preload: true,    // Critical path — Monaco editor uses this font
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["italic", "normal"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c8860a",
};

export const metadata: Metadata = {
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Anuvaad",
  },
  title: {
    template: "%s | Anuvaad",
    default: "Anuvaad — AI Code Translator & Explainer",
  },
  description:
    "AI-powered code explanations, reverse engineering, and code translation. Supports 35+ languages including Python, JavaScript, Java, C++, TypeScript, Rust, Go, Swift, Kotlin, SQL, and more.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_FRONTEND_URL || "https://anuvaad.dev"),
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
  ],
  authors: [{ name: "Anuvaad Team" }],
  creator: "Anuvaad",
  publisher: "Anuvaad",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Anuvaad — AI Code Translator",
    description:
      "Translate code to plain English and back. 35+ languages supported. Understand any codebase instantly.",
    type: "website",
    url: "https://anuvaad.dev",
    siteName: "Anuvaad",
    images: [
      {
        url: "/opengraph-image", // dynamic OG route
        width: 1200,
        height: 630,
        alt: "Anuvaad AI Code Translator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Anuvaad — AI Code Translator",
    description:
      "Translate code to plain English and back. 35+ languages including Python, JavaScript, Java, C++, and more.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable} ${playfair.variable} ${outfit.variable} ${garamond.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* DNS prefetch for critical API domains */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.groq.com" />
        <link rel="dns-prefetch" href="https://api.groq.com" />
        <link rel="preconnect" href="https://api.deepseek.com" />
        <link rel="dns-prefetch" href="https://api.deepseek.com" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ThemeProvider>
          <PostHogProvider>
            <TooltipProvider>
              <AuthProvider>
                  {children}
              </AuthProvider>
            </TooltipProvider>
          </PostHogProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: "text-sm",
              style: { fontFamily: "var(--font-sans)" },
            }}
            richColors
            closeButton
          />
        </ThemeProvider>
      </body>
    </html>
  );
}

