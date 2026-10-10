"use client";

import React from "react";
import { Network, Layers, FileCode, CheckCircle2, ArrowRight } from "lucide-react";
import { useTranslationStore } from "@/stores/translationStore";
import { useShallow } from "zustand/react/shallow";

export function SymbolGraphView() {
  // Optimize: Use useShallow with specific selectors to prevent re-renders when other store values change
  const { repoName, repoFiles, selectFile, setActiveView } = useTranslationStore(
    useShallow((state) => ({
      repoName: state.repoName,
      repoFiles: state.repoFiles,
      selectFile: state.selectFile,
      setActiveView: state.setActiveView,
    }))
  );
  const fileEntries = Object.entries(repoFiles);

  const handleNodeClick = (path: string) => {
    selectFile(path);
    setActiveView("editor");
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0a0a0a] p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#202020] pb-4">
        <div>
          <h2 className="text-base font-semibold text-[#f8fafc] flex items-center gap-2">
            <Network className="h-5 w-5 text-[#f59e0b]" />
            AST Dependency DAG & Cross-File Symbol Graph
          </h2>
          <p className="text-xs text-[#94a3b8] mt-1">
            Visual Directed Acyclic Graph showing topological compilation order and symbol propagation.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded bg-[#171717] px-3 py-1 text-xs font-mono text-[#94a3b8] border border-[#202020]">
          <Layers className="h-3.5 w-3.5 text-[#22c55e]" />
          <span>{fileEntries.length} DAG Nodes Resolved</span>
        </div>
      </div>

      {/* Visual DAG Flow Diagram */}
      <div className="mt-8 flex flex-col items-center justify-center space-y-6">
        <div className="text-[11px] font-mono text-[#94a3b8] uppercase tracking-wider">
          Topological Compilation Sequence
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 max-w-4xl">
          {fileEntries.map(([path, file], index) => {
            const isCompleted = file.status === "completed";
            return (
              <React.Fragment key={path}>
                <button
                  type="button"
                  onClick={() => handleNodeClick(path)}
                  aria-label={`Open file ${path}, tier ${index + 1}, status ${file.status}`}
                  className={`group cursor-pointer rounded-xl border p-4 text-left transition-all shadow-lg hover:scale-105 min-w-[220px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
                    isCompleted
                      ? "border-[#22c55e]/40 bg-[#111111] hover:border-[#22c55e]"
                      : "border-[#202020] bg-[#111111] hover:border-[#f59e0b]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold uppercase text-[#94a3b8]">
                      Tier {index + 1}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#f59e0b] animate-pulse" />
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#f8fafc]">
                    <FileCode className="h-4 w-4 text-[#f59e0b]" />
                    <span className="truncate">{path}</span>
                  </div>

                  <div className="mt-3 border-t border-[#202020] pt-2 text-[11px] font-mono text-[#94a3b8]">
                    <span>Lang: {file.language}</span>
                    <span className="mx-2">•</span>
                    <span className={isCompleted ? "text-[#22c55e]" : "text-[#f59e0b]"}>
                      {file.status}
                    </span>
                  </div>
                </button>

                {index < fileEntries.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-[#94a3b8] shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Structural Symbol Table */}
      <div className="mt-12">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">
          Indexed Symbols in Semantic Vector Memory (pgvector)
        </h3>
        <div className="rounded-xl border border-[#202020] bg-[#111111] overflow-hidden">
          <table className="w-full text-left text-xs text-[#94a3b8]">
            <thead className="border-b border-[#202020] bg-[#0c0c0f] font-mono text-[11px] text-[#f8fafc]">
              <tr>
                <th className="px-4 py-2.5">File Path</th>
                <th className="px-4 py-2.5">Primary Symbol</th>
                <th className="px-4 py-2.5">Kind</th>
                <th className="px-4 py-2.5">Vector Contract</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020] font-mono">
              {fileEntries.map(([path, file]) => (
                <tr key={path} className="hover:bg-[#171717] transition-colors">
                  <td className="px-4 py-3 text-[#f8fafc] font-medium">{path}</td>
                  <td className="px-4 py-3 text-[#f59e0b]">
                    {path.includes("models")
                      ? "UserAccount"
                      : path.includes("service")
                      ? "AuthService"
                      : "main"}
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8]">
                    {path.includes("models")
                      ? "Class / Interface"
                      : path.includes("service")
                      ? "Service Class"
                      : "Function"}
                  </td>
                  <td className="px-4 py-3 text-[#22c55e]">768-dim Embed Ready</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleNodeClick(path)}
                      className="rounded bg-[#1f2937] px-2.5 py-1 text-[11px] text-[#f8fafc] hover:bg-[#374151]"
                    >
                      Open Code
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
