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
          <p>© {new Date().getFullYear()} Anuvaad Technologies. All rights reserved.</p>
          <p className="font-medium text-slate-600 dark:text-slate-400">
            Engineered for developers who value clarity.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default WisprFooter;
