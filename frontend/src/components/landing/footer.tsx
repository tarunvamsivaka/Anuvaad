import Link from "next/link";
import { Logo } from "@/components/landing/Logo";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Demo", href: "#demo" },
    { label: "FAQ", href: "#faq" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  Resources: [
    { label: "GitHub", href: "https://github.com/tarunvamsivaka/Anuvaad", external: true },
    { label: "API Docs", href: "https://github.com/tarunvamsivaka/Anuvaad#api-endpoints", external: true },
    { label: "Changelog", href: "https://github.com/tarunvamsivaka/Anuvaad/blob/main/CHANGELOG.md", external: true },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

const STATUS_SERVICES = [
  { label: "API", ok: true },
  { label: "Auth", ok: true },
  { label: "AI Engine", ok: true },
];

export function Footer() {
  return (
    <footer className="relative" style={{ background: "#0d1117" }}>
      {/* Warm amber gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

      {/* Subtle ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(200,134,10,0.04) 0%, transparent 60%)" }}
      />

      <div className="mx-auto max-w-6xl px-6 py-16 relative z-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column — spans 2 */}
          <div className="lg:col-span-2">
            <Link href="/" className="block w-fit">
              <Logo theme="dark" />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500 max-w-xs">
              AI-powered code translation for developers, students, and teams.
              Understand any codebase in minutes, not weeks.
            </p>

            {/* Social links */}
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://github.com/tarunvamsivaka/Anuvaad"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center h-9 w-9 rounded-xl border border-white/07 bg-white/03 text-neutral-500 hover:text-amber-400 hover:border-amber-500/20 hover:bg-amber-500/06 transition-all duration-200"
                aria-label="GitHub"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>
            </div>

            {/* Status indicator */}
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/06 bg-white/02 px-3 py-2.5 w-fit">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">All Systems Operational</span>
              </div>
              <div className="flex items-center gap-2 border-l border-white/06 pl-2">
                {STATUS_SERVICES.map(s => (
                  <span key={s.label} className="text-[9px] text-neutral-600 font-medium">{s.label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 mb-5">{category}</h4>
              <ul className="space-y-3.5">
                {links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-neutral-500 hover:text-amber-400 transition-colors duration-200 inline-block"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-neutral-500 hover:text-amber-400 transition-colors duration-200 inline-block"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-10 wispr-divider-dark" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-neutral-600">
            © {new Date().getFullYear()} Anuvaad. All rights reserved. · Made in India 🇮🇳
          </p>
          <p
            className="text-xs text-neutral-700 font-medium"
            style={{ fontFamily: "var(--font-garamond, Georgia, serif)", fontStyle: "italic" }}
          >
            Built with ♥ for developers who care about understanding.
          </p>
        </div>
      </div>
    </footer>
  );
}
