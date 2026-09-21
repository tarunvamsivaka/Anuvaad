import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface WisprFooterProps {
  className?: string;
}

export function WisprFooter({ className }: WisprFooterProps) {
  return (
    <footer
      id="footer"
      className={cn(
        "bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-16 px-4 sm:px-6 lg:px-8 w-full",
        className
      )}
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-2.5 mb-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg inline-flex"
              aria-label="Anuvaad Home"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-sm">
                A
              </div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                Anuvaad
              </span>
            </Link>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed mb-6">
              Next-generation AI code intelligence and translation platform for
              high-velocity engineering teams. Understand any repository in
              seconds.
            </p>
            {/* Status Indicator */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              aria-label="System status: All systems operational with 99.99% uptime"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>All Systems Operational · 99.99% Uptime</span>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a
                  href="#workbench"
                  className="hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Workbench
                </a>
              </li>
              <li>
                <a
                  href="#git-pr"
                  className="hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Git/PR Demo
                </a>
              </li>
              <li>
                <a
                  href="#benchmarks"
                  className="hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Benchmark Matrix
                </a>
              </li>
              <li>
                <a
                  href="#security"
                  className="hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Enterprise Security
                </a>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a
                  href="https://github.com/tarunvamsivaka/Anuvaad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/tarunvamsivaka/Anuvaad#api-endpoints"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  API Reference
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/tarunvamsivaka/Anuvaad/blob/main/CHANGELOG.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Changelog
                </a>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Enterprise Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Enterprise
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a
                  href="#security"
                  className="hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  SOC2 Type II Report
                </a>
              </li>
              <li>
                <a
                  href="#security"
                  className="hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  HIPAA Compliance
                </a>
              </li>
              <li>
                <a
                  href="#security"
                  className="hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  VPC Deployment
                </a>
              </li>
              <li>
                <a
                  href="#security"
                  className="hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Trust Center
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <p>© {new Date().getFullYear()} Anuvaad Technologies. All rights reserved.</p>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">·</span>
            <p className="flex items-center gap-1">
              Made with <span className="text-red-500">♥</span> in India 🇮🇳
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-medium text-slate-600 dark:text-slate-400 hidden sm:block">
              Engineered for developers who value clarity.
            </p>
            <a
              href="https://github.com/tarunvamsivaka/Anuvaad"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Star Anuvaad on GitHub"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-500/40 hover:text-slate-900 dark:hover:text-white hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              ⭐ Star on GitHub
            </a>
            <a
              href="https://x.com/anuvaad_dev"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Anuvaad on X (Twitter)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Follow @anuvaad_dev
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default WisprFooter;
