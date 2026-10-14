import { useState, memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TypographyProse } from "@/design/primitives/TypographyProse";
import { ChevronDown, ChevronUp, Copy, Check, Pencil, GripVertical, Sparkles } from "lucide-react";
import { EnglishEditor } from "./EnglishEditor";
import { TranslationBlock } from "../../_types";
import { useTranslationStore } from "../../_store/useTranslationStore";

export interface BlockCardProps {
  blockId?: string;
  block?: TranslationBlock;
  index: number;
  onEditBlock?: (index: number, newEnglish: string) => void;
  isStreaming?: boolean;
}

export const BlockCard = memo(function BlockCard({
  blockId,
  block: propBlock,
  index,
  onEditBlock,
  isStreaming: propIsStreaming,
}: BlockCardProps) {
  // Granular subscription: Only re-render when this specific card's slice changes
  const storeBlock = useTranslationStore(
    useShallow((state) => (blockId ? state.blocksById[blockId] : undefined))
  );
  const updateBlockEnglish = useTranslationStore((state) => state.updateBlockEnglish);

  const block = propBlock ?? storeBlock;
  const isStreaming = propIsStreaming ?? false;

  const [collapsed, setCollapsed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const copyCode = useCallback(() => {
    if (!block?.code_snippet) return;
    navigator.clipboard.writeText(block.code_snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, [block?.code_snippet]);

  const copyText = useCallback(() => {
    if (!block?.english_translation) return;
    navigator.clipboard.writeText(block.english_translation);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  }, [block?.english_translation]);

  // If the block is not yet available during initial mount, render a min-h-[120px] transition skeleton
  if (!block) {
    return (
      <div
        className="w-full mb-6 rounded-xl border border-border/50 bg-card/40 p-5 animate-pulse min-h-[120px] flex flex-col justify-center gap-2"
        style={{ overflowAnchor: "auto" }}
      >
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-3 w-3/4 bg-muted/60 rounded" />
        <div className="h-3 w-1/2 bg-muted/40 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, y: -10 }}
      whileHover={{ y: -2 }}
      transition={{ 
        duration: 0.45, 
        delay: index * 0.08, 
        ease: [0.22, 1, 0.36, 1],
        y: { type: "spring", stiffness: 300, damping: 30 },
      }}
      className={cn("group relative flex w-full mb-6 items-start min-h-[120px]", isStreaming && "opacity-90")}
      style={{ overflowAnchor: "auto" }}
    >
      {/* Notion-style drag handle & block indicator */}
      <div className="absolute -left-10 top-3 flex items-center justify-center w-8 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" aria-label="Drag to reorder block" className="h-6 w-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <GripVertical className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card/70 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md hover:border-amber-500/30">
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-mono text-[10px] uppercase tracking-wider">
              <Sparkles className="mr-1 h-3 w-3" /> Block {index + 1}
            </Badge>
          </div>
          <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" aria-label={collapsed ? "Expand block" : "Collapse block"} className="h-6 w-6" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col"
            >
              <div className="relative border-b border-border bg-slate-900/95 dark:bg-black/40 p-4">
                <pre className="font-mono text-[13px] text-slate-300 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed selection:bg-amber-500/30">
                  <code>{block.code_snippet}</code>
                </pre>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={copyCode} 
                  className="absolute right-3 top-3 h-7 gap-1.5 opacity-0 group-hover:opacity-100 transition-all bg-white/10 text-white hover:bg-white/20 border-0 shadow-none backdrop-blur-md"
                >
                  {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copiedCode ? "Copied" : "Copy"}
                </Button>
              </div>
              
              <div className="relative p-5 bg-transparent">
                {isEditing ? (
                  <EnglishEditor
                    initialText={block.english_translation}
                    onSave={(newText) => {
                      if (blockId) {
                        updateBlockEnglish(blockId, newText);
                      }
                      onEditBlock?.(index, newText);
                      setIsEditing(false);
                    }}
                    onCancel={() => setIsEditing(false)}
                  />
                ) : (
                  <>
                    <div className="pr-20 text-card-foreground text-[15px] leading-relaxed font-outfit">
                      <TypographyProse size="sm" className="whitespace-pre-wrap">
                        {block.english_translation}
                      </TypographyProse>
                    </div>
                    <div className="absolute right-4 top-4 flex gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-all">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        aria-label="Edit explanation"
                        onClick={() => setIsEditing(true)} 
                        className="h-8 w-8 bg-white/50 dark:bg-black/50 backdrop-blur-md shadow-sm border-border hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        aria-label={copiedText ? "Copied!" : "Copy translation"}
                        onClick={copyText} 
                        className="h-8 w-8 bg-white/50 dark:bg-black/50 backdrop-blur-md shadow-sm border-border hover:bg-muted"
                      >
                        {copiedText ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.blockId === nextProps.blockId &&
    prevProps.index === nextProps.index &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.onEditBlock === nextProps.onEditBlock &&
    prevProps.block === nextProps.block
  );
});
