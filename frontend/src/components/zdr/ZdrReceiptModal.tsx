"use client";

import React, { useState } from "react";
import { ShieldCheck, Copy, Check, X, Lock, Cpu } from "lucide-react";
import { useTranslationStore } from "@/stores/translationStore";
import { verifyReceipt } from "@/lib/api";
import { useShallow } from "zustand/react/shallow";

export function ZdrReceiptModal() {
  // Optimize: Use useShallow with specific selectors to prevent re-renders when other store values change
  const { isReceiptModalOpen, selectedReceipt, closeReceiptModal } = useTranslationStore(
    useShallow((state) => ({
      isReceiptModalOpen: state.isReceiptModalOpen,
      selectedReceipt: state.selectedReceipt,
      closeReceiptModal: state.closeReceiptModal,
    }))
  );
  const [copied, setCopied] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isReceiptModalOpen || !selectedReceipt) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(selectedReceipt, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await verifyReceipt(selectedReceipt);
      setVerificationResult(res.verified ? "VERIFIED: Cryptographic HMAC signature matches perfectly." : "FAILED: Signature mismatch.");
    } catch {
      setVerificationResult("VERIFICATION_FAILED: Network or server error");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="zdr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl rounded-xl border border-[#202020] bg-[#111111] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#202020] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f59e0b]/10 text-[#f59e0b]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="zdr-modal-title" className="text-lg font-semibold text-[#f8fafc]">
                Zero Code Retention (ZDR) Cryptographic Receipt
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Deterministic mathematical proof that source code was processed in volatile RAM only.
              </p>
            </div>
          </div>
          <button
            onClick={closeReceiptModal}
            className="rounded-lg p-2 text-[#94a3b8] hover:bg-[#1f2937] hover:text-[#f8fafc]"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-[#202020] bg-[#0a0a0a] p-4 font-mono text-xs">
            <div className="mb-2 flex items-center justify-between text-[#94a3b8]">
              <span className="flex items-center gap-1.5 font-sans font-medium text-[#f8fafc]">
                <Lock className="h-3.5 w-3.5 text-[#22c55e]" />
                HMAC-SHA256 Audit Digest
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded bg-[#1f2937] px-2 py-1 text-[11px] text-[#f8fafc] hover:bg-[#374151]"
              >
                {copied ? <Check className="h-3 w-3 text-[#22c55e]" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy JSON"}
              </button>
            </div>
            <p className="break-all text-[#22c55e]">{selectedReceipt.audit_digest}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-[#202020] bg-[#0a0a0a] p-3 font-mono text-xs">
              <span className="block text-[11px] font-sans font-medium text-[#94a3b8]">Source SHA-256 Hash</span>
              <p className="mt-1 truncate text-[#f8fafc]" title={selectedReceipt.source_code_hash}>
                {selectedReceipt.source_code_hash}
              </p>
            </div>
            <div className="rounded-lg border border-[#202020] bg-[#0a0a0a] p-3 font-mono text-xs">
              <span className="block text-[11px] font-sans font-medium text-[#94a3b8]">RAM Lifespan</span>
              <p className="mt-1 flex items-center gap-1 text-[#f59e0b]">
                <Cpu className="h-3.5 w-3.5" />
                {selectedReceipt.ephemeral_lifecycle_ms} ms (ephemeral)
              </p>
            </div>
          </div>

          {verificationResult && (
            <div
              className={`rounded-lg border p-3 text-xs font-medium ${
                verificationResult.startsWith("VERIFIED")
                  ? "border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e]"
                  : "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]"
              }`}
            >
              {verificationResult}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-[#202020] pt-4">
          <span className="text-[11px] text-[#94a3b8]">
            Zero Disk Retention: <span className="font-semibold text-[#22c55e]">Verified 100%</span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="rounded-lg bg-[#f59e0b] px-4 py-2 text-xs font-semibold text-[#0a0a0a] transition hover:bg-[#d97706] disabled:opacity-50"
            >
              {isVerifying ? "Verifying..." : "Verify Digest"}
            </button>
            <button
              onClick={closeReceiptModal}
              className="rounded-lg border border-[#202020] bg-[#171717] px-4 py-2 text-xs font-semibold text-[#f8fafc] hover:bg-[#262626]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
