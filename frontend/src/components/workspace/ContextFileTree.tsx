"use client";

import React from "react";
import {
  FileCode,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  RotateCw,
  GitBranch,
  Layers,
} from "lucide-react";
import { useTranslationStore } from "@/stores/translationStore";
import { useShallow } from "zustand/react/shallow";

export function ContextFileTree() {
  // Optimize: Use useShallow with specific selectors to prevent re-renders when other store values change
  // Impact: Reduces re-renders significantly on rapid store updates (like code changes)
  const {
    repoName,
    repoFiles,
    selectedFilePath,
    selectFile,
    isBatchTranslating,
    setBatchTranslating,
    updateFileTranslation,
  } = useTranslationStore(useShallow((state) => ({
    repoName: state.repoName,
    repoFiles: state.repoFiles,
    selectedFilePath: state.selectedFilePath,
    selectFile: state.selectFile,
    isBatchTranslating: state.isBatchTranslating,
    setBatchTranslating: state.setBatchTranslating,
    updateFileTranslation: state.updateFileTranslation,
  })));

  const fileList = Object.values(repoFiles);
  const completedCount = fileList.filter((f) => f.status === "completed").length;

  const handleRunBatchTranslation = async () => {
    setBatchTranslating(true);
    try {
      // Simulate/trigger topological batch translation across the DAG order
      for (const file of fileList) {
        if (file.status === "completed") continue;

        // Mock translation update
        await new Promise((r) => setTimeout(r, 600));
        const translatedMock = `// Modernized ${file.path}\nexport function modernizedRoutine(): void {\n    // Converted logic\n}`;
        updateFileTranslation(file.path, translatedMock, true);
      }
    } finally {
      setBatchTranslating(false);
    }
  };

  return (
    <div
      className="flex h-full w-[260px] flex-col border-r border-[#202020] bg-[#111111] overflow-hidden"
      aria-label="Repository files explorer"
    >
      {/* Repo Title Header */}
      <div className="border-b border-[#202020] p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#f8fafc]">
          <GitBranch className="h-4 w-4 text-[#f59e0b]" />
          <span className="truncate" title={repoName}>
            {repoName}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-[#94a3b8]">
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            DAG Order: Auto
          </span>
          <span>
            {completedCount}/{fileList.length} ready
          </span>
        </div>
      </div>

      {/* Batch DAG Action Button */}
      <div className="p-2 border-b border-[#202020]">
        <button
          onClick={handleRunBatchTranslation}
          disabled={isBatchTranslating}
          className="flex w-full items-center justify-center gap-1.5 rounded bg-[#f59e0b]/15 px-3 py-1.5 text-xs font-medium text-[#f59e0b] border border-[#f59e0b]/30 hover:bg-[#f59e0b]/25 transition disabled:opacity-50"
        >
          {isBatchTranslating ? (
            <>
              <RotateCw className="h-3.5 w-3.5 animate-spin" />
              Modernizing DAG...
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              Modernize All Files (DAG)
            </>
          )}
        </button>
      </div>

      {/* File Hierarchy List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8] px-2 py-1">
          Source Files
        </div>

        {fileList.map((file) => {
          const isSelected = selectedFilePath === file.path;
          return (
            <button
              key={file.path}
              onClick={() => selectFile(file.path)}
              className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors ${
                isSelected
                  ? "bg-[#171717] text-[#f8fafc] border-l-2 border-[#f59e0b]"
                  : "text-[#94a3b8] hover:bg-[#141416] hover:text-[#f8fafc]"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <FileCode className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
                <span className="truncate">{file.path}</span>
              </div>

              {/* Status Badge */}
              <div className="shrink-0 ml-2">
                {file.status === "completed" && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#22c55e]" />
                )}
                {file.status === "translating" && (
                  <RotateCw className="h-3.5 w-3.5 animate-spin text-[#f59e0b]" />
                )}
                {file.status === "pending" && (
                  <Clock className="h-3.5 w-3.5 text-[#64748b]" />
                )}
                {file.status === "failed" && (
                  <AlertTriangle className="h-3.5 w-3.5 text-[#ef4444]" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
