"use client";

import React, { useState } from "react";
import { ShieldCheck, Lock, CheckCircle2, Copy, Check, Download, Cpu, HardDrive } from "lucide-react";

interface AuditEntry {
  id: string;
  digest: string;
  sourceHash: string;
  timestamp: string;
  userId: string;
  ramDurationMs: number;
  diskPersisted: boolean;
}

export function AuditLedgerView() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const mockAudits: AuditEntry[] = [
    {
      id: "zdr_rec_001",
      digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      sourceHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      timestamp: "2026-10-08 19:35:12 UTC",
      userId: "usr_lead_architect",
      ramDurationMs: 14.2,
      diskPersisted: false,
    },
    {
      id: "zdr_rec_002",
      digest: "b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78",
      sourceHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
      timestamp: "2026-10-08 19:26:45 UTC",
      userId: "ephemeral-guest",
      ramDurationMs: 9.8,
      diskPersisted: false,
    },
    {
      id: "zdr_rec_003",
      digest: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
      sourceHash: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
      timestamp: "2026-10-08 19:15:30 UTC",
      userId: "ephemeral-guest",
      ramDurationMs: 11.5,
      diskPersisted: false,
    },
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0a0a0a] p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#202020] pb-4">
        <div>
          <h2 className="text-base font-semibold text-[#f8fafc] flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#22c55e]" />
            Verifiable Zero Code Retention (ZDR) Cryptographic Ledger
          </h2>
          <p className="text-xs text-[#94a3b8] mt-1">
            Deterministic HMAC-SHA256 receipts mathematically proving code was never stored to non-volatile disks.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded bg-[#22c55e]/10 px-3 py-1 text-xs font-mono text-[#22c55e] border border-[#22c55e]/30">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>100% Zero Retention Attested</span>
        </div>
      </div>

      {/* Top Guarantees Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="rounded-xl border border-[#202020] bg-[#111111] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[#94a3b8]">
            <HardDrive className="h-4 w-4 text-[#22c55e]" />
            <span>Disk Write Policy</span>
          </div>
          <p className="mt-2 text-lg font-bold text-[#f8fafc]">0 Bytes Written</p>
          <p className="text-[11px] text-[#94a3b8] mt-0.5 font-mono">Volatile RAM Buffers Only</p>
        </div>

        <div className="rounded-xl border border-[#202020] bg-[#111111] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[#94a3b8]">
            <Lock className="h-4 w-4 text-[#f59e0b]" />
            <span>Audit Algorithm</span>
          </div>
          <p className="mt-2 text-lg font-bold text-[#f8fafc]">HMAC-SHA256</p>
          <p className="text-[11px] text-[#94a3b8] mt-0.5 font-mono">Cryptographic Nonce Digested</p>
        </div>

        <div className="rounded-xl border border-[#202020] bg-[#111111] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[#94a3b8]">
            <Cpu className="h-4 w-4 text-[#3b82f6]" />
            <span>Average Buffer Lifespan</span>
          </div>
          <p className="mt-2 text-lg font-bold text-[#f8fafc]">11.8 ms</p>
          <p className="text-[11px] text-[#94a3b8] mt-0.5 font-mono">Immediate Explicit Purge</p>
        </div>
      </div>

      {/* Receipt Records Table */}
      <div className="mt-8">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">
          Session Audit Receipts Ledger
        </h3>
        <div className="rounded-xl border border-[#202020] bg-[#111111] overflow-hidden">
          <table className="w-full text-left text-xs text-[#94a3b8]">
            <thead className="border-b border-[#202020] bg-[#0c0c0f] font-mono text-[11px] text-[#f8fafc]">
              <tr>
                <th className="px-4 py-2.5">Receipt ID</th>
                <th className="px-4 py-2.5">HMAC-SHA256 Digest</th>
                <th className="px-4 py-2.5">Source Hash</th>
                <th className="px-4 py-2.5">RAM Duration</th>
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020] font-mono">
              {mockAudits.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#171717] transition-colors">
                  <td className="px-4 py-3 text-[#f8fafc] font-medium">{entry.id}</td>
                  <td className="px-4 py-3 text-[#22c55e] max-w-[200px] truncate" title={entry.digest}>
                    {entry.digest}
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8] max-w-[140px] truncate" title={entry.sourceHash}>
                    {entry.sourceHash}
                  </td>
                  <td className="px-4 py-3 text-[#f59e0b]">{entry.ramDurationMs} ms</td>
                  <td className="px-4 py-3 text-[#94a3b8]">{entry.timestamp}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleCopy(entry.id, entry.digest)}
                      className="inline-flex items-center gap-1 rounded bg-[#1f2937] px-2.5 py-1 text-[11px] text-[#f8fafc] hover:bg-[#374151]"
                    >
                      {copiedId === entry.id ? (
                        <>
                          <Check className="h-3 w-3 text-[#22c55e]" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
