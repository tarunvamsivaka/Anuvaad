"use client";

/**
 * frontend/src/app/share/[id]/ShareClient.tsx
 *
 * ADD-02 (UX): Client component extracted from share page.tsx to allow the
 * parent server component to export generateMetadata (incompatible with "use client").
 * FE-01: Multi-block code views use preformatted syntax containers instead of instantiating N Monaco Editors.
 * FE-04: Theme tokens (bg-background, text-text-primary, bg-surface-mid, border-border-subtle).
 * FE-05: Layout-shift-free skeleton loading.
 */
import { useEffect, useState } from "react";
import { Loader2, Code2, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { MonacoSkeleton } from "@/components/ui/monaco-skeleton";

const Editor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.Editor), {
  ssr: false,
  loading: () => <MonacoSkeleton lines={10} />,
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
        const res = await fetch(`/api/v1/share/${id}`);
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Translation Not Found</h1>
          <p className="text-text-muted">{error || "This translation may have been made private or deleted."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Shared Translation</h1>
            <p className="text-sm text-text-muted">
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
                className="rounded-xl border border-border-subtle bg-surface-mid overflow-hidden"
              >
                {/* Code */}
                <div className="bg-surface-mid border-b border-border-subtle">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle">
                    <Code2 className="w-4 h-4 text-text-muted" />
                    <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                      {item.source_language}
                    </span>
                  </div>
                  <pre className="p-4 font-mono text-sm leading-relaxed overflow-x-auto bg-surface-charcoal text-text-primary whitespace-pre-wrap select-text">
                    <code>{block.code_snippet}</code>
                  </pre>
                </div>

                {/* Translation */}
                <div className="bg-surface-low/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                      Explanation
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {block.english_translation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Fallback for older items without blocks */
          <div className="rounded-xl border border-border-subtle overflow-hidden">
            <div className="bg-surface-mid border-b border-border-subtle">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle">
                <Code2 className="w-4 h-4 text-text-muted" />
                <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
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
          <p className="text-xs text-text-muted">
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

