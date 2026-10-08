import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anuvaad — High-Performance AI Code Translation Platform",
  description: "Deterministic AST-validated multi-language code translation with Verifiable Zero Code Retention (ZDR).",
  keywords: ["AI code translation", "Tree-sitter", "AST validation", "Zero Code Retention", "developer tools"],
  authors: [{ name: "Anuvaad Engineering" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0a] text-[#f8fafc] antialiased selection:bg-[#f59e0b]/30 selection:text-[#ffffff]">
        {children}
      </body>
    </html>
  );
}
