# Anuvaad — Operational & Compliance Standards

This document establishes the official operational standards, maintenance protocols, data protection procedures, and automated auditing systems for taking **Anuvaad** live in public production.

---

## 1. Security Maintenance & Patching Standards
To ensure the long-term defense of the platform against threats, follow these strict security maintenance and patching standards:

### A. Dependency Vulnerability Gating
*   **Frontend**: Run `npm audit` weekly. Any **High** or **Critical** vulnerabilities must be resolved immediately using `npm audit fix` or by manually updating the affected packages.
*   **Backend**: Scan Python dependencies using `pip-audit` or Dependabot. Pinned dependency versions should be regularly audited.
*   **CI/CD Pipeline**: Dependency scanning is integrated into the Git workspace to prevent vulnerable code compilation.

### B. OS & Environment Patching
*   **OS Updates**: Production servers (e.g. Ubuntu LTS) must be updated bi-weekly (`sudo apt-get update && sudo apt-get upgrade -y`).
*   **Docker Images**: Docker base images (`python:3.11-slim`, `node:20-alpine`) are rebuilt on every major deployment to ensure OS-level packages carry the latest security patches.
*   **Nginx SSL/TLS**: Force TLS 1.3 exclusively. The cipher suite must be periodically audited to maintain an **A+ rating** on SSL Labs.

---

## 2. Data Protection & Backup Standards
Anuvaad prioritizes user data integrity, strict privacy, and robust disaster recovery.

### A. Database Backups (Supabase PostgreSQL)
*   **Frequency**: Automated daily full physical database backups.
*   **Retention**: Backups are securely retained for **30 days**.
*   **Billing/Transaction Records**: Transaction logs and payment records (from Razorpay) are preserved in a read-only archive for **7 years** to satisfy Indian GST and accounting compliance laws.
*   **Disaster Recovery (RTO/RPO)**:
    *   **Recovery Point Objective (RPO)**: Max 24 hours of data loss in a catastrophic failure.
    *   **Recovery Time Objective (RTO)**: Full restore and backend reconnect within **2 hours**.

### B. Data at Rest & in Transit Encryption
*   **Data in Transit**: Enforced via HTTPS with HSTS (`max-age=63072000`). All client-to-API and API-to-Supabase communication is fully encrypted.
*   **Data at Rest**: Supabase PostgreSQL uses **AES-256** transparent database encryption. API Keys and payment credentials are mathematically encrypted / hashed (SHA-256) at rest.
*   **Privacy & Right to Erasure (GDPR/CCPA)**:
    *   No source code is ever cached or written to disk; it is processed purely in volatile RAM.
    *   User account deletion cascade-deletes all associated translation history and credits from Supabase instantly.

---

## 3. Uptime, Monitoring, and Error Tracking Standards
Maintaining absolute system transparency and a minimum **99.9% target uptime**.

### A. Uptime SLA & Health Polling
*   **Target Uptime**: **99.9%** (less than 43 minutes of unscheduled downtime per month).
*   **API Health Endpoint**: `/api/health` polls and monitors:
    1.  Redis memory cache ping.
    2.  Supabase connection status.
    3.  Groq & DeepSeek API key configurations.

### B. Active Observability
*   **Error Monitoring (Sentry)**: Captures unhandled backend exceptions and frontend hydration/render crashes.
    *   *Standard*: No sensitive PII (passwords, raw code) must be logged inside Sentry issues.
*   **Usage Metrics (Prometheus/Grafana)**: Scraped from `/api/metrics/prometheus` by Prometheus.
    *   *SLA Indicators*: Alert when backend 5xx errors exceed **2%** or average translation latency exceeds **5.0s**.

---

## 4. Content & Link Integrity Standards
Ensuring that Anuvaad legal, static, and landing pages remain robust and link-perfect.

*   **Static Page Routing**: All anchors (`<a>`) in terms and privacy HTML files must map to Next.js dynamic routing pathnames (`/`, `/terms`, `/privacy`) instead of static legacy `.html` extensions.
*   **Broken Link Audits**: Periodically crawled to check that external hyperlinks (to Razorpay, Supabase, Groq, DeepSeek, or PostHog privacy pages) remain healthy (returning HTTP 200/301).
*   **HTML Structure**: Enforce descriptive `lang="en"` tags and comprehensive `<meta>` tags on all pages for WCAG and SEO alignment.

---

## 5. Automated Compliance & Error-Tracking Subagent
To guarantee these standards are consistently maintained in production, we have deployed an automated **Compliance & Error-Tracking Subagent**.

### A. What the Subagent Audits
The subagent script `scripts/compliance_subagent.py` programmatically runs:
1.  **Site Health & Ping Integrity**: Tests backend responsiveness, Redis availability, and DB connection.
2.  **Metrics Scraping**: Reads recent requests, error rates, and API latencies.
3.  **Link Integrity Scanner**: Audits HTML pages for broken links or legacy `.html` routes.
4.  **Security Headers & Git Gating**: Verifies secure Nginx/API headers and `.env` concealment.
5.  **NPM Vulnerability Audit**: Inspects frontend packages.

### B. Running the Subagent
Run the auditor locally or configure it on a recurring cron job on the production server:
```bash
python scripts/compliance_subagent.py
```

### C. Viewing Reports
*   **Console Log**: Real-time progress is printed to the terminal console using cross-platform safe indicators.
*   **Detailed Log Archive**: Appended to [compliance_report.log](file:///f:/Anuvaad/compliance_report.log).
*   **Structured JSON Output**: A compiled machine-readable audit report is exported to [compliance_report.json](file:///f:/Anuvaad/compliance_report.json), exposing operational metrics, failures, warnings, and findings.
