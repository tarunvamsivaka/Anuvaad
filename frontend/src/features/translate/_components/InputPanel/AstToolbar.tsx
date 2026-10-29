"use client";

import React, { useState } from "react";
import * as parser from "@babel/parser";
import generate from "@babel/generator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Cpu, CheckCircle2, Wand2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { useTranslationStore } from "../../_store/useTranslationStore";
import { modernizeReactCode } from "@/engine";
import { extractAstLineRanges } from "@/lib/ast-line-mapper";

interface AstToolbarProps {
  sourceLanguage: string;
}

export function AstToolbar({ sourceLanguage }: AstToolbarProps) {
  // ⚡ Bolt Performance Optimization:
  // Using useShallow to prevent unnecessary re-renders when unrelated properties in useTranslationStore change.
  // This is especially critical during streaming since other fields update rapidly.
  const { input, setInput } = useTranslationStore(
    useShallow((state) => ({
      input: state.input,
      setInput: state.setInput,
    }))
  );
  const [previousCode, setPreviousCode] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleNormalizeAst = () => {
    setOpen(false);
    if (!input || !input.trim()) {
      toast.error("Please enter code first.");
      return;
    }

    const startTime = performance.now();
    try {
      const ast = parser.parse(input, {
        sourceType: "module",
        plugins: ["jsx", "typescript", "classProperties", "decorators-legacy"],
        errorRecovery: true,
      });

      const output = generate(ast, {
        retainLines: false,
        compact: false,
        comments: true,
      });

      if (output.code && output.code !== input) {
        setPreviousCode(input);
        setInput(output.code);
        const elapsed = (performance.now() - startTime).toFixed(1);
        toast.success(`AST normalized & formatted in ${elapsed}ms`, {
          action: {
            label: "Undo",
            onClick: () => {
              setInput(input);
              toast.info("Reverted formatting.");
            },
          },
        });
      } else {
        toast.info("Code structure is already normalized.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Parse error";
      toast.error(`AST normalization failed: ${msg}`);
    }
  };

  const handleBindingAudit = () => {
    setOpen(false);
    if (!input || !input.trim()) {
      toast.error("Please enter code first.");
      return;
    }

    try {
      const ranges = extractAstLineRanges(input, sourceLanguage);
      const totalSymbols = ranges.filter((r) => r.name).length;
      const functions = ranges.filter((r) => r.type === "function").length;
      const classes = ranges.filter((r) => r.type === "class").length;

      toast.success(
        `AST Audit: ${totalSymbols} named symbols (${functions} functions, ${classes} classes) across ${ranges.length} logical blocks.`
      );
    } catch {
      toast.error("Could not complete symbol audit on input code.");
    }
  };

  const handleModernize = () => {
    setOpen(false);
    if (!input || !input.trim()) {
      toast.error("Please enter code first.");
      return;
    }

    const startTime = performance.now();
    try {
      const result = modernizeReactCode(input);
      const elapsed = (performance.now() - startTime).toFixed(1);

      if (result.success && result.changes && result.changes.length > 0) {
        setPreviousCode(input);
        setInput(result.code);
        toast.success(`Applied ${result.changes.length} AST transforms in ${elapsed}ms`, {
          action: {
            label: "Undo",
            onClick: () => {
              setInput(input);
              toast.info("Reverted modernizations.");
            },
          },
        });
      } else if (result.success) {
        toast.info("No class components or deprecated patterns detected.");
      } else {
        toast.error("AST Transform: Input contains syntax errors.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transform error";
      toast.error(`AST Modernization failed: ${msg}`);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label="AST Codemod Tools"
          title="Deterministic Client-Side AST Tools"
          className="inline-flex items-center justify-center rounded-md font-mono text-[11px] font-medium h-7 px-2 gap-1 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
        >
          <Cpu className="h-3 w-3 text-amber-500" />
          <span className="hidden md:inline">AST Tools</span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-2 text-xs flex flex-col gap-1 shadow-xl">
          <div className="px-2 py-1 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            Deterministic AST Engine ($0)
          </div>
          <div className="h-px bg-border my-0.5" />
          <button
            type="button"
            onClick={handleNormalizeAst}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted text-left transition-colors cursor-pointer"
          >
            <Wand2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium text-foreground">Normalize & Format AST</span>
              <span className="text-[10px] text-muted-foreground">Clean syntax structure</span>
            </div>
          </button>
          <button
            type="button"
            onClick={handleBindingAudit}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted text-left transition-colors cursor-pointer"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium text-foreground">Symbol & Binding Audit</span>
              <span className="text-[10px] text-muted-foreground">Detect scope & symbols</span>
            </div>
          </button>
          <button
            type="button"
            onClick={handleModernize}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted text-left transition-colors cursor-pointer"
          >
            <Cpu className="h-3.5 w-3.5 text-sky-500 shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium text-foreground">Modernize (Babel Engine)</span>
              <span className="text-[10px] text-muted-foreground">Class to Hooks transformation</span>
            </div>
          </button>

          {previousCode && (
            <>
              <div className="h-px bg-border my-0.5" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setInput(previousCode);
                  setPreviousCode(null);
                  toast.info("Reverted to previous code.");
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-left transition-colors cursor-pointer"
              >
                <Undo2 className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-[11px]">Undo Last AST Transform</span>
              </button>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
