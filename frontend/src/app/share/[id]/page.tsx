"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Code2, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const Editor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.Editor), {
  ssr: false,
  loading: () => <Skeleton className="h-[500px] w-full rounded-lg" />,
});

interface SharedItem {
  id: string;
  mode: string;
  source_language: string;
  target_language: string;
  input_preview: string;
  result_blocks: any;
  model_used: string;
  created_at: string;
}

export default function SharedTranslationPage() {
  const { id } = useParams();
  const [item, setItem] = useState<SharedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchShared() {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${API}/api/share/${id}`);
        if (!res.ok) throw new Error("Item not found or is not public");
        const data = await res.json();
        setItem(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchShared();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080c14]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#080c14] text-white p-6">
        <Code2 className="h-12 w-12 text-slate-600 mb-4" />
        <h1 className="text-xl font-bold">Snippet Not Found</h1>
        <p className="text-slate-400 mt-2 text-center max-w-sm">
          This translation might have been deleted or is no longer public.
        </p>
      </div>
    );
  }

  // Determine what code to show
  let codeContent = "";
  if (item.result_blocks && Array.isArray(item.result_blocks)) {
    codeContent = item.result_blocks.map(b => b.code_snippet).join("\n\n");
  } else if (typeof item.result_blocks === "string") {
    codeContent = item.result_blocks;
  } else {
    codeContent = JSON.stringify(item.result_blocks, null, 2);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] text-slate-900 dark:text-slate-100 p-4 sm:p-8 flex justify-center">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-mono">Shared Snippet</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
              {item.mode}
            </span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>From: {item.source_language || "Auto"}</span>
            <span>→</span>
            <span>To: {item.target_language || "English"}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3"/> {item.model_used}</span>
          </div>
        </div>

        {/* Editor Wrapper */}
        <div className="glass-apple rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl">
          <div className="h-10 border-b border-black/5 dark:border-white/5 flex items-center px-4 bg-white/40 dark:bg-black/40 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#ff5f56] border border-[#e0443e] shadow-sm"></div>
              <div className="h-3 w-3 rounded-full bg-[#ffbd2e] border border-[#dea123] shadow-sm"></div>
              <div className="h-3 w-3 rounded-full bg-[#27c93f] border border-[#1aab29] shadow-sm"></div>
            </div>
          </div>
          <div className="h-[600px] w-full">
            <Editor
              height="100%"
              language={item.target_language === "english" ? "markdown" : item.target_language}
              theme="vs-dark"
              value={codeContent}
              options={{ readOnly: true, minimap: { enabled: false } }}
            />
          </div>
        </div>
        
        <div className="text-center text-xs text-slate-500">
          Powered by Anuvaad — AI Code Translator
        </div>
      </div>
    </div>
  );
}
