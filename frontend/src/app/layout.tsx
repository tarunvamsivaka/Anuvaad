import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
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
    "AI-powered code explanations, reverse engineering, and code translation for developers, students, and teams. Supports Python, JavaScript, Java, C++, TypeScript, Rust, and Go.",
  metadataBase: new URL("https://anuvaad.dev"),
  openGraph: {
    title: "Anuvaad — AI Code Translator",
    description:
      "Translate code to plain English and back. Understand any codebase instantly.",
    type: "website",
    url: "https://anuvaad.dev",
    siteName: "Anuvaad",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anuvaad — AI Code Translator",
    description:
      "Translate code to plain English and back. Supports Python, JavaScript, Java, and more.",
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
      className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
