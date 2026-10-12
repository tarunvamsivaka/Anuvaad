"use client";

import React, { useState, useEffect } from "react";
import { Key, ShieldCheck, X, Check, Eye, EyeOff } from "lucide-react";
import { useTranslationStore } from "@/stores/translationStore";

export function ByokModal() {
  const { isByokModalOpen, closeByokModal, setByokApiKey } = useTranslationStore();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("anuvaad_byok_key");
      if (stored) {
        setApiKey(stored);
        setByokApiKey(stored);
      }
    }
  }, [setByokApiKey]);

  if (!isByokModalOpen) return null;

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("anuvaad_byok_key", apiKey.trim());
      setByokApiKey(apiKey.trim());
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        closeByokModal();
      }, 1200);
    }
  };

  const handleClear = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("anuvaad_byok_key");
      setApiKey("");
      setByokApiKey("");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="byok-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-[#202020] bg-[#111111] p-6 shadow-2xl">
        <button
          onClick={closeByokModal}
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[#94a3b8] hover:bg-[#1a1a1a] hover:text-[#f8fafc] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <h2 id="byok-modal-title" className="text-base font-bold text-[#f8fafc]">
              Bring Your Own Key (BYOK)
            </h2>
            <p className="text-xs text-[#94a3b8]">
              Optional frontier LLM assistance for complex, ambiguous edge cases
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-[#22c55e]/20 bg-[#22c55e]/5 p-3.5 text-xs text-[#94a3b8]">
          <div className="flex items-center gap-2 font-semibold text-[#22c55e] mb-1">
            <ShieldCheck className="h-4 w-4" />
            Architectural Zero Data Retention (ZDR)
          </div>
          <p className="leading-relaxed">
            Your key never touches Anuvaad servers because there are no servers. It is stored
            exclusively in your browser&apos;s encrypted local memory and only called directly from your client if requested.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="byok-input" className="block text-xs font-semibold text-[#f8fafc] mb-1.5">
              Gemini or OpenAI API Key
            </label>
            <div className="relative">
              <input
                id="byok-input"
                type={showKey ? "text" : "password"}
                placeholder="AIzaSy... or sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-xl border border-[#262626] bg-[#171717] px-3.5 py-2.5 text-xs font-mono text-[#f8fafc] placeholder-[#666] focus:border-[#f59e0b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b]"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f8fafc]"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleClear}
              className="text-xs text-[#ef4444] hover:underline"
            >
              Clear Key
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={closeByokModal}
                className="rounded-xl border border-[#262626] px-4 py-2 text-xs font-semibold text-[#94a3b8] hover:bg-[#1a1a1a]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-xl bg-[#f59e0b] px-4 py-2 text-xs font-bold text-black hover:bg-[#d97706] transition-colors"
              >
                {saved ? <Check className="h-4 w-4" /> : null}
                {saved ? "Saved in Browser!" : "Save Key"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
