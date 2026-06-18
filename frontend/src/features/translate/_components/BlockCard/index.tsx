import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TypographyProse } from "@/design/primitives/TypographyProse";
import { ChevronDown, ChevronUp, Copy, Check, Pencil, GripVertical, Sparkles } from "lucide-react";
import { EnglishEditor } from "./EnglishEditor";
import { TranslationBlock } from "../../_types";

interface BlockCardProps {
  block: TranslationBlock;
  index: number;
  onEditBlock?: (newEnglish: string) => void;
}

export function BlockCard({ block, index, onEditBlock }: BlockCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(block.code_snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyText = () => {
    navigator.clipboard.writeText(block.english_translation);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

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
      className="group relative flex w-full mb-6 items-start"
    >
      {/* Notion-style drag handle & block indicator */}
      <div className="absolute -left-10 top-3 flex items-center justify-center w-8 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" aria-label="Drag to reorder block" className="h-6 w-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <GripVertical className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200/50 bg-white/70 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md hover:border-amber-500/30 dark:border-white/10 dark:bg-[#0c1222]/80">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 px-4 py-2.5">
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
              <div className="relative border-b border-slate-100 dark:border-white/5 bg-slate-900/95 dark:bg-black/40 p-4">
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
                      onEditBlock?.(newText);
                      setIsEditing(false);
                    }}
                    onCancel={() => setIsEditing(false)}
                  />
                ) : (
                  <>
                    <div className="pr-20 text-slate-800 dark:text-slate-200 text-[15px] leading-relaxed font-outfit">
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
                        className="h-8 w-8 bg-white/50 dark:bg-black/50 backdrop-blur-md shadow-sm border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        aria-label={copiedText ? "Copied!" : "Copy translation"}
                        onClick={copyText} 
                        className="h-8 w-8 bg-white/50 dark:bg-black/50 backdrop-blur-md shadow-sm border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
                      >
                        {copiedText ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />}
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
}
