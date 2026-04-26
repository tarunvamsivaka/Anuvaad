import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
    { label: "Changelog", href: "/changelog" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "API Reference", href: "/api" },
    { label: "Blog", href: "/blog" },
    { label: "Status", href: "/status" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Security", href: "/security" },
    { label: "Contact", href: "/contact" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/20">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-tight">Anuvaad</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-600">Translator</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">AI-powered code translation for developers, students, and teams.</p>
          </div>
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold">{category}</h4>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Separator className="my-10" />
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Anuvaad. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="https://github.com/tarunvamsivaka/Anuvaad" target="_blank" rel="noopener" className="text-sm text-muted-foreground transition-colors hover:text-foreground">GitHub</a>
            <a href="https://twitter.com/anuvaaddev" target="_blank" rel="noopener" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Twitter</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
