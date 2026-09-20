"use client";

import React from "react";
import {
  Lock,
  ShieldCheck,
  FileCheck,
  KeyRound,
  Server,
  UserCheck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/lib/use-scroll-reveal";

export interface EnterpriseSecurityProps {
  className?: string;
}

export interface SecurityPillar {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge: string;
  description: string;
}

export const ENTERPRISE_SECURITY_PILLARS: SecurityPillar[] = [
  {
    icon: Lock,
    title: "Zero Code Storage",
    badge: "Ephemeral Memory Guarantee",
    description:
      "Code snippets are streamed through encrypted volatile RAM memory buffers during inference and discarded immediately upon response completion. Zero code or AST data is ever written to disk, stored in persistent logs, or retained for model training.",
  },
  {
    icon: ShieldCheck,
    title: "SOC2 Type II Certified",
    badge: "AICPA SOC2 Certified",
    description:
      "Independently audited AICPA SOC2 Type II compliance report covering Security, Availability, and Confidentiality trust service criteria. Continuous third-party automated control monitoring.",
  },
  {
    icon: FileCheck,
    title: "HIPAA & GDPR Ready",
    badge: "BAA Available · EU Data Residency",
    description:
      "Compliant with EU General Data Protection Regulation (GDPR) Article 28 data processor obligations and HIPAA requirements. Standard Business Associate Agreements (BAAs) available for enterprise tiers.",
  },
  {
    icon: KeyRound,
    title: "TLS 1.3 & AES-256 Encryption",
    badge: "FIPS 140-3 Encryption",
    description:
      "All telemetry, translation streams, and API communications are encrypted in transit via TLS 1.3 with Perfect Forward Secrecy (PFS), and encrypted at rest with hardware-accelerated AES-256 keys.",
  },
  {
    icon: Server,
    title: "Single-Tenant VPC & Air-Gap Deployment",
    badge: "AWS / GCP / Azure VPC",
    description:
      "Deploy Anuvaad entirely within your private corporate AWS, GCP, or Azure Virtual Private Cloud, or run on air-gapped on-premises Kubernetes clusters with custom LLM endpoints.",
  },
  {
    icon: UserCheck,
    title: "SAML 2.0 & SCIM SSO Provisioning",
    badge: "Okta · Azure AD · Google",
    description:
      "Enterprise Single Sign-On (SSO) with SAML 2.0 and automated user lifecycle provisioning via SCIM. Immutable audit logs for compliance, workspace role-based access control (RBAC), and session timeout policies.",
  },
];

export function EnterpriseSecurity({ className }: EnterpriseSecurityProps) {
  const [headerRef, headerVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });
  const [gridRef, gridVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.05 });
  const [stripRef, stripVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.3 });

  return (
    <section
      id="security"
      className={cn(
        "bg-slate-950 text-slate-100 py-24 sm:py-32 relative overflow-hidden border-t border-b border-slate-800 w-full",
        className
      )}
      aria-labelledby="security-heading"
    >
      {/* Ambient Gradient Glow — breathes */}
      <div
        className="radial-breathe pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(56,189,248,0.10),transparent_70%)]"
        style={{ animation: "radial-glow-breathe 6s ease-in-out infinite" }}
        aria-hidden="true"
      />

      {/* Subtle grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,rgba(255,255,255,0.5) 0px,rgba(255,255,255,0.5) 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,rgba(255,255,255,0.5) 0px,rgba(255,255,255,0.5) 1px,transparent 1px,transparent 48px)",
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header — scroll reveal */}
        <div
          ref={headerRef}
          className={cn(
            "max-w-3xl mx-auto text-center mb-16 sr-fade-up",
            headerVisible && "is-visible"
          )}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Enterprise-Grade Security & Governance</span>
          </div>
          <h2
            id="security-heading"
            className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-5"
          >
            Privacy by Default.{" "}
            <span className="text-amber-400">Zero Code Retained.</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Built from the ground up for strict enterprise security, regulated
            finance/healthcare compliance, and multi-tenant isolation.
          </p>
        </div>

        {/* 6 Pillars Grid — staggered scroll reveal */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
        >
          {ENTERPRISE_SECURITY_PILLARS.map((pillar, idx) => (
            <div
              key={pillar.title}
              className={cn(
                "group rounded-2xl border border-slate-800 bg-slate-900/60 p-7 flex flex-col justify-between cursor-default",
                "hover:border-amber-500/40 hover:bg-slate-900/90",
                "hover:-translate-y-1 hover:shadow-[0_8px_32px_-8px_rgba(245,158,11,0.18)]",
                "transition-all duration-300",
                // Scroll reveal
                "sr-fade-up",
                gridVisible && "is-visible"
              )}
              style={{
                "--sr-delay": `${idx * 90}ms`,
              } as React.CSSProperties}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  {/* Icon with hover glow */}
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 group-hover:border-amber-500/40 group-hover:scale-110 transition-all duration-300">
                    <pillar.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 group-hover:border-slate-600 transition-colors">
                    {pillar.badge}
                  </span>
                </div>

                {/* Animated top accent line on hover */}
                <div className="h-px w-full bg-gradient-to-r from-amber-500/0 via-amber-500/60 to-amber-500/0 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-100 transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                  {pillar.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Architectural Verification Strip */}
        <div
          ref={stripRef}
          className={cn(
            "rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 hover:border-slate-700 transition-all duration-300 sr-fade-up",
            stripVisible && "is-visible"
          )}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 hover:scale-110 transition-transform">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">
                Need a custom BAA or SOC2 Type II Audit Report?
              </h4>
              <p className="text-xs sm:text-sm text-slate-400">
                Our compliance engineering team provides complete security
                packages for enterprise procurement.
              </p>
            </div>
          </div>
          <a
            href="#enterprise-contact"
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-white text-slate-950 hover:bg-amber-400 hover:text-slate-950 transition-all duration-200 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 hover:scale-105"
          >
            <span>Request Security Package</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

export default EnterpriseSecurity;
