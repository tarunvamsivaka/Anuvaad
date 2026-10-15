"use client";

import React, { useState, useEffect, useRef } from "react";
import { Key, ShieldCheck, Trash2, Eye, EyeOff, X, ExternalLink, Sparkles } from "lucide-react";
import { saveByokKey, clearByokKey, hasByokKey } from "@/lib/byok-vault";

interface ByokVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ByokVaultModal({ isOpen, onClose }: ByokVaultModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      hasByokKey().then((exists) => setHasKey(exists));
      setStatusMessage(null);
      setApiKey("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!apiKey.trim()) return;

    setIsSaving(true);
    try {
      await saveByokKey(apiKey.trim());
      setHasKey(true);
      setApiKey("");
      setStatusMessage("Key encrypted and stored in local AES-GCM-256 vault.");
      window.dispatchEvent(new Event("byok-vault-updated"));
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch {
      setStatusMessage("Failed to encrypt and save key.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      await clearByokKey();
      setHasKey(false);
      setApiKey("");
      setStatusMessage("Key purged from local vault.");
      window.dispatchEvent(new Event("byok-vault-updated"));
    } catch {
      setStatusMessage("Failed to purge key from vault.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="byok-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-2xl border border-border-medium bg-surface-mid p-6 shadow-2xl relative text-text-primary"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-surface-high transition-colors"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <h2 id="byok-modal-title" className="text-base font-bold">
              Client-Side BYOK Vault
            </h2>
            <p className="text-xs text-text-muted">
              Bring Your Own Key · Unlimited Translations · $0/Month
            </p>
          </div>
        </div>

        <div className="my-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-slate-300 leading-relaxed">
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-400">Verifiable Zero-Retention:</span> Your API key is encrypted in your browser&apos;s IndexedDB using hardware-accelerated <code className="text-emerald-300 font-mono text-[11px]">AES-GCM-256</code>. It is never logged or stored on our servers.
            </div>
          </div>
        </div>

        {hasKey ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border-subtle bg-surface-low p-3.5 flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 mb-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  BYOK Active · Unlimited
                </span>
                <p className="text-xs font-mono text-slate-400">
                  •••••••••••••••••••• (Encrypted)
                </p>
              </div>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/20"
                title="Remove key"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Purge
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3.5">
            <div>
              <label htmlFor="byok-key-input" className="block text-xs font-semibold text-text-primary mb-1">
                Google AI Studio (Gemini) API Key
              </label>
              <div className="relative">
                <input
                  id="byok-key-input"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  autoFocus
                  className="w-full rounded-xl border border-border-subtle bg-surface-low px-3.5 py-2.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-200"
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-amber-400 hover:underline"
              >
                <span>Get free Gemini key</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <span>Free tier: 15 RPM / 1M TPM</span>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-border-medium px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-surface-high transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !apiKey.trim()}
                className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/20 inline-flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 fill-current" />
                {isSaving ? "Encrypting..." : "Activate BYOK"}
              </button>
            </div>
          </form>
        )}

        {statusMessage && (
          <p className="mt-3 text-center text-xs text-amber-400 font-medium">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}
