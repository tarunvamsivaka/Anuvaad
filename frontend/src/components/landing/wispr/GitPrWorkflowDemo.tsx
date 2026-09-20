"use client";

import React, { useState } from "react";
import { GitPullRequest, ShieldCheck, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GitPrWorkflowDemoProps {
  onSelectDiff?: (diffId: string) => void;
  className?: string;
}

const PR_FILES = [
  {
    id: "auth-handler",
    filename: "src/auth/session_manager.ts",
    changes: "+28 -12",
    risk: "Low",
    summary:
      "Migrates session validation from monolithic in-memory store to distributed Redis token cache with asymmetric JWKS signature verification.",
    diff: `@@ -14,8 +14,14 @@ export async function validateSession(token: string) {
-  const session = memoryStore.get(token);
-  if (!session || session.expiresAt < Date.now()) return null;
+  const payload = await jwtVerify(token, JWKS_KEYSET);
+  const cached = await redis.get(\`session:\${payload.sub}\`);
+  if (!cached) throw new AuthenticationError("Session expired");
+  return { userId: payload.sub, tenant: payload.tenantId };
 }`,
  },
  {
    id: "db-pool",
    filename: "src/database/pool_manager.go",
    changes: "+45 -8",
    risk: "Medium",
    summary:
      "Introduces connection pooling with exponential backoff retry and circuit breaker logic for high-concurrency read replicas.",
    diff: `@@ -42,6 +42,12 @@ func (p *Pool) Acquire(ctx context.Context) (*Conn, error) {
+    select {
+    case conn := <-p.idle:
+        return conn, nil
+    case <-time.After(p.timeout):
+        return nil, ErrPoolExhausted
+    }`,
  },
  {
    id: "api-router",
    filename: "api/routes/translator.py",
    changes: "+19 -4",
    risk: "Low",
    summary:
      "Adds rate-limiting middleware and streaming SSE response formatting for low-latency client chunks.",
    diff: `@@ -88,4 +88,10 @@ async def stream_translation(request: Request):
+    async for chunk in translation_engine.stream(req.code):
+        yield f"data: {json.dumps(chunk)}\\n\\n"`,
  },
];

export function GitPrWorkflowDemo({
  onSelectDiff,
  className,
}: GitPrWorkflowDemoProps) {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const activeFile = PR_FILES[activeFileIndex];

  const handleSelectFile = (index: number) => {
    setActiveFileIndex(index);
    onSelectDiff?.(PR_FILES[index].id);
  };

  return (
    <div
      id="git-pr"
      className={cn("w-full flex flex-col items-center", className)}
      aria-label="Interactive Git PR Workflow Demo"
    >
      {/* Module Eyebrow */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-4">
        <GitPullRequest className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Automated Pull Request Code Reviews</span>
      </div>

      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 text-center">
        Automate Architectural PR Reviews in Seconds
      </h2>
      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl text-center mb-8">
        Anuvaad analyzes code diffs, detects subtle architectural breaking
        changes, and publishes executive summaries directly to your GitHub &
        GitLab pipelines.
      </p>

      {/* PR Workflow Card */}
      <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        {/* PR Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  PR #142: Core Architecture & Session Migration
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Open
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                branch <code className="font-mono">feat/redis-session-jwks</code> into <code className="font-mono">main</code>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>CI Passed</span>
            </span>
          </div>
        </div>

        {/* Files Tabs and Diff View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* File Explorer List */}
          <div className="p-3 bg-slate-50/50 dark:bg-slate-950/40">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 py-1.5 mb-1">
              Changed Files ({PR_FILES.length})
            </div>
            <div className="flex flex-col gap-1">
              {PR_FILES.map((file, idx) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => handleSelectFile(idx)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer",
                    activeFileIndex === idx
                      ? "bg-white dark:bg-slate-900 shadow-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  )}
                >
                  <div className="truncate pr-2">
                    <div className="font-mono truncate">{file.filename}</div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                    {file.changes}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Diff & AI Summary View */}
          <div className="lg:col-span-2 p-4 sm:p-5 flex flex-col justify-between">
            {/* AI Review Summary Box */}
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  Anuvaad AI Review Summary
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeFile.summary}
              </p>
            </div>

            {/* Code Diff Display */}
            <div className="rounded-xl bg-slate-950 p-3.5 font-mono text-xs overflow-x-auto text-slate-200 mb-4">
              <pre className="leading-relaxed whitespace-pre-wrap">
                {activeFile.diff}
              </pre>
            </div>

            {/* Diff Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Zero breaking API changes detected</span>
              </div>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Risk Rating: {activeFile.risk}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GitPrWorkflowDemo;
