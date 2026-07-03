"use client";

/**
 * frontend/src/app/share/[id]/ShareClient.tsx
 *
 * ADD-02 (UX): Client component extracted from share page.tsx to allow the
 * parent server component to export generateMetadata (incompatible with "use client").
 */
import { useEffect, useState } from "react";
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
  result_blocks: unknown;
  model_used: string;
  created_at: string;
  blocks?: Array<{
    id: string;
    code_snippet: string;
    english_translation: string;
  }>;
}

export default function SharedTranslationClient({ id }: { id: string }) {
  const [item, setItem] = useState<SharedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchShared() {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${API}/api/v1/share/${id}`);
        if (!res.ok) throw new Error("Item not found or is not public");
        const data = await res.json();
        setItem(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load shared item");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchShared();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Translation Not Found</h1>
          <p className="text-zinc-400">{error || "This translation may have been made private or deleted."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Shared Translation</h1>
            <p className="text-sm text-zinc-400">
              {item.source_language}
              {item.target_language ? ` → ${item.target_language}` : ""} · via Anuvaad AI
            </p>
          </div>
        </div>

        {/* Code blocks */}
        {item.blocks && item.blocks.length > 0 ? (
          <div className="space-y-6">
            {item.blocks.map((block) => (
              <div
                key={block.id}
                className="rounded-xl border border-zinc-800 overflow-hidden"
              >
                {/* Code */}
                <div className="bg-zinc-900 border-b border-zinc-800">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800">
                    <Code2 className="w-4 h-4 text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                      {item.source_language}
                    </span>
                  </div>
                  <Editor
                    height="200px"
                    language={item.source_language?.toLowerCase() ?? "plaintext"}
                    value={block.code_snippet}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                    }}
                    theme="vs-dark"
                  />
                </div>

                {/* Translation */}
                <div className="bg-zinc-900/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                      Explanation
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {block.english_translation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Fallback for older items without blocks */
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-2 px-4 py-2">
                <Code2 className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  {item.source_language}
                </span>
              </div>
              <Editor
                height="300px"
                language={item.source_language?.toLowerCase() ?? "plaintext"}
                value={item.input_preview ?? ""}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                }}
                theme="vs-dark"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-500">
            Translated with{" "}
            <a
              href="https://anuvaad.dev"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              Anuvaad AI
            </a>{" "}
            using {item.model_used}
          </p>
        </div>
      </div>
    </div>
  );
}
