# Anuvaad Security & Privacy Whitepaper: Architectural Zero Code Retention (ZCR)

**Document Version**: 2.4  
**Date**: September 2026  
**Classification**: Public Architecture Whitepaper  
**Target Audience**: Enterprise Security Auditors, Chief Information Security Officers (CISOs), Lead Compliance Engineers, DevOps & Infrastructure Architects  

---

## Executive Summary

Software enterprises and regulated engineering organizations often face severe compliance barriers when adopting AI-powered code translation and comprehension platforms. Standard cloud developer tools persist developer code snippets to relational databases, object storage buckets, telemetry logs, or training corpuses.

**Anuvaad** eliminates this risk by introducing **Architectural Zero Code Retention (ZCR)**. When operating in ephemeral mode (`X-Anuvaad-Privacy-Mode: ephemeral` or anonymous live workbench), developer code operates strictly in volatile memory (RAM) and is guaranteed never to touch persistent disk, cache stores, or secondary log files.

---

## 1. Zero Code Retention Architecture

```
                                    ┌────────────────────────────────────────────────────────┐
                                    │               Anuvaad Zero-Retention Runtime           │
                                    │                                                        │
[Developer Client]                  │  [FastAPI Ingestion] ──► [Volatile RAM Buffer]         │
        │                           │         │                         │                    │
        │ TLS 1.3 / Perfect Forward │         │ Memory-Only Token       │ Direct TLS Stream  │
        │ Secrecy (PFS)             │         ▼ Stream                  ▼                    │
        ▼                           │  [Response Egress]     [Groq LPU / vLLM Engine]        │
[Nginx Reverse Proxy]               │         ▲                         │                    │
        │                           │         └─────────────────────────┘                    │
        ▼                           │                        │                               │
[FastAPI Backend Endpoint]          │                        ▼                               │
(X-Anuvaad-Privacy-Mode: ephemeral) │          [Explicit Dereference & GC Sweep]             │
                                    │          - del input_tokens                            │
                                    │          - del response_text                           │
                                    │          - bypass Redis cache                          │
                                    │          - bypass PostgreSQL history                   │
                                    └────────────────────────────────────────────────────────┘
```

### 1.1 Memory-Only Execution Path
1. **Direct Stream Ingestion**: Code payloads sent with the header `X-Anuvaad-Privacy-Mode: ephemeral` are parsed directly from the incoming HTTP/2 stream into ephemeral Python string buffers.
2. **Cache Bypass**: The application bypasses Redis key-value stores entirely (`cache.get` and `cache.put` are skipped), ensuring neither plaintext code nor AST representations reside in volatile shared caches.
3. **Storage Decoupling**: Database record writes (`save_translation_history_task` and relational `translation_history` insertions) are omitted from the execution graph. Only non-identifying completion counters are incremented for rate-limiting.
4. **Volatile Dereferencing Sweeps**: Upon stream completion, local variable pointers (`user_prompt`, `response_text`, `raw`, and `result`) are explicitly dereferenced with `del` statements, releasing memory buffers for immediate operating system garbage reclamation.

---

## 2. Cryptographic Transit Security

| Layer | Standard / Implementation | Security Guarantee |
| :--- | :--- | :--- |
| **Transport Layer** | TLS 1.3 (RFC 8446) / TLS 1.2 minimum | Encrypts all data in flight between client and edge. |
| **Cipher Suites** | `ECDHE-ECDSA-AES128-GCM-SHA256`, `ECDHE-RSA-AES256-GCM-SHA384`, `CHACHA20-POLY1305` | Perfect Forward Secrecy (PFS) ensures past sessions cannot be decrypted if server private key is compromised. |
| **HSTS Enforcement** | `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` | Mandates HTTPS across all subdomains for 2 years with HSTS preload list eligibility. |
| **Content Security** | CSP Level 3 with strict script/frame white-lists | Prevents cross-site scripting (XSS), inline script injection, and unauthorized frame embedding. |
| **Frame & Object Protections** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` | Eliminates clickjacking and MIME-type sniffing exploits. |

---

## 3. High-Speed Streaming Demo & Rate Limiting

The landing page live interactive workbench (`POST /api/v1/demo/translate-stream`) allows prospective teams to verify model performance on custom code snippets without requiring account creation:
- **Maximum Payload Size**: 1,000 characters per demo request.
- **Sliding-Window Rate Limiting**: Enforced via Redis atomic counter (`demo_stream_rate:<ip>`) with a strict ceiling of 10 requests per client IP per 24-hour rolling window.
- **LPU Sub-Second Token Egress**: Streamed directly via Groq LPU (`llama-3.3-70b-versatile`), delivering token-by-token Server-Sent Events (SSE) at sub-800ms P50 latency.
- **Zero Storage by Default**: Anonymous demo streams operate under automatic Zero Code Retention with no database records created.

---

## 4. Background Task Queue Decoupling

In enterprise and production deployments:
- **Worker Isolation**: Celery workers run as decoupled, isolated operating system processes (`celery -A app.queue.celery_config.celery_app worker`).
- **Broker Durability**: Redis is configured with Append-Only File (`--appendonly yes`), guaranteeing zero loss of asynchronous audit logs and webhook dispatches across system restarts.
- **Fail-Safe Processing**: In environments where Celery workers are undergoing scheduled maintenance, the platform provides graceful fallback without terminating client connections.

---

## 5. Auditability & Verifiable Compliance

Anuvaad maintains 100% automated regression suites testing all privacy pathways:
- **`tests/test_zero_code_retention.py`**: Validates that requests bearing `X-Anuvaad-Privacy-Mode: ephemeral` emit the required `X-Anuvaad-Privacy: ephemeral; zero-retention` header and verify zero invocations of Redis translation caching or database history persistence.
- **`tests/test_demo_stream.py`**: Verifies anonymous demo streaming SSE structure, sliding-window IP rate limiting, and length bounds.
- **`tests/test_security.py`**: Comprehensive adversarial suite verifying SQL injection prevention, authentication boundary validation, and CSRF protection.

---

## 6. Conclusion

By combining **Architectural Zero Code Retention**, **Memory Dereferencing Sweeps**, **TLS 1.3 Perfect Forward Secrecy**, and **Decoupled Asynchronous Workers**, Anuvaad provides an enterprise-ready code intelligence runtime with zero code retention risk.
