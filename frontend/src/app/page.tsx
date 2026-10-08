"use client";

import React from "react";
import { GlobalSidebar } from "@/components/workspace/GlobalSidebar";
import { ContextFileTree } from "@/components/workspace/ContextFileTree";
import { MonacoDualPane } from "@/components/editor/MonacoDualPane";
import { ZdrReceiptModal } from "@/components/zdr/ZdrReceiptModal";
import { GithubExportModal } from "@/components/workspace/GithubExportModal";
import { SymbolGraphView } from "@/components/workspace/SymbolGraphView";
import { AuditLedgerView } from "@/components/workspace/AuditLedgerView";
import { ShieldCheck, Cpu, Database, Terminal, GitBranch } from "lucide-react";
import { useTranslationStore } from "@/stores/translationStore";

export default function HomePage() {
  const { activeView, repoName, selectedFilePath } = useTranslationStore();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a] text-[#f8fafc]">
      {/* Column 1: Global Navigation Sidebar (60px) */}
      <GlobalSidebar />

      {/* Column 2: Context Panel (File Tree & DAG Hierarchy) */}
      {activeView === "repo" && <ContextFileTree />}

      {/* Column 3: Main Workspace Stage */}
      <main className="flex flex-1 flex-col overflow-hidden bg-[#0a0a0a]">
        {/* Workspace Top Bar */}
        <header className="flex h-[48px] shrink-0 items-center justify-between border-b border-[#202020] bg-[#0c0c0f] px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xs font-bold text-[#f59e0b] tracking-wide flex items-center gap-1.5">
              <span>Anuvaad</span>
              <span className="text-[#94a3b8] font-normal">/</span>
            </h1>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-[#f59e0b]" aria-hidden="true" />
              <span className="text-xs font-semibold text-[#f8fafc]">{repoName}</span>
              <span className="text-[#94a3b8]">/</span>
              <span className="text-xs font-mono text-[#f59e0b]">{selectedFilePath}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#22c55e]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse"></span>
              Zero Code Retention (ZDR) Active
            </div>
          </div>
        </header>

        {/* Dynamic Workspace Content */}
        <div className="flex-1 p-3 overflow-hidden flex flex-col justify-between">
          {activeView === "symbols" ? (
            <SymbolGraphView />
          ) : activeView === "audit" ? (
            <AuditLedgerView />
          ) : (
            <MonacoDualPane />
          )}

          {/* Bottom Technical Status Bar */}
          <footer className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#202020] bg-[#111111] px-3 py-1.5 text-[11px] font-mono text-[#94a3b8] shrink-0">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-[#f8fafc]">
                <Cpu className="h-3.5 w-3.5 text-[#f59e0b]" />
                Inference: <span className="text-[#f59e0b]">Tier 1 (Cerebras LPU) / Tier 2 (Gemini 2.0 Flash)</span>
              </span>
              <span className="hidden sm:flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-[#22c55e]" />
                Self-Healing AST: Active
              </span>
              <span className="hidden md:flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-[#3b82f6]" />
                pgvector Memory: Connected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#22c55e]" />
              <span>HMAC-SHA256 Ephemeral Guarantee</span>
            </div>
          </footer>
        </div>
      </main>

      {/* Global Modals */}
      <ZdrReceiptModal />
      <GithubExportModal />
    </div>
  );
}
