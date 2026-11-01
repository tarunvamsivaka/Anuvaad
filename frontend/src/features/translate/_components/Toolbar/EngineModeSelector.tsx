"use client";

import React, { useEffect, useState } from "react";
import { Cloud, KeyRound, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslationStore } from "../../_store/useTranslationStore";
import { useShallow } from "zustand/react/shallow";
import { getByokKey } from "@/lib/byok-vault";
import { toast } from "sonner";

export function EngineModeSelector() {
  const { executionEngine, setExecutionEngine } = useTranslationStore(useShallow(state => ({
    executionEngine: state.executionEngine,
    setExecutionEngine: state.setExecutionEngine,
  })));
  const [hasByok, setHasByok] = useState(false);

  useEffect(() => {
    getByokKey().then((key) => {
      setHasByok(!!(key && key.trim()));
    });

    const handleVaultUpdated = () => {
      getByokKey().then((key) => {
        setHasByok(!!(key && key.trim()));
      });
    };

    window.addEventListener("byok-vault-updated", handleVaultUpdated);
    return () => window.removeEventListener("byok-vault-updated", handleVaultUpdated);
  }, []);

  const handleSelect = (engine: "cloud" | "byok" | "offline") => {
    if (engine === "byok" && !hasByok) {
      toast.info("No BYOK key enrolled. Open Sidebar to configure your AES-GCM-256 Vault.");
      window.dispatchEvent(new CustomEvent("open-byok-vault"));
      return;
    }
    setExecutionEngine(engine);
    if (engine === "offline") {
      toast.success("Switched to Offline Local Engine ($0 · On-Device AST)");
    } else if (engine === "byok") {
      toast.success("Switched to BYOK Vault Engine (Unlimited · AES-GCM)");
    } else {
      toast.success("Switched to Cloud AI Gateway (Gemini Flash)");
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Execution Engine Mode"
      className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium shadow-xs"
    >
      <button
        type="button"
        role="radio"
        aria-checked={executionEngine === "cloud"}
        onClick={() => handleSelect("cloud")}
        title="Cloud Gateway (Free Tier Gemini / Groq)"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-mono transition-all cursor-pointer",
          executionEngine === "cloud"
            ? "bg-background text-foreground shadow-xs font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Cloud className="h-3 w-3 text-sky-500" />
        <span className="hidden lg:inline">Cloud</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={executionEngine === "byok"}
        onClick={() => handleSelect("byok")}
        title="Client-Side AES-GCM-256 BYOK Vault"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-mono transition-all cursor-pointer",
          executionEngine === "byok"
            ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <KeyRound className="h-3 w-3 text-emerald-500" />
        <span className="hidden lg:inline">BYOK Vault</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={executionEngine === "offline"}
        onClick={() => handleSelect("offline")}
        title="Zero-Server On-Device AST Analysis ($0)"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-mono transition-all cursor-pointer",
          executionEngine === "offline"
            ? "bg-background text-amber-600 dark:text-amber-400 shadow-xs font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Zap className="h-3 w-3 text-amber-500" />
        <span className="hidden lg:inline">Offline Local</span>
      </button>
    </div>
  );
}
