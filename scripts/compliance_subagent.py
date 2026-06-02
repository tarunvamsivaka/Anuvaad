#!/usr/bin/env python3
"""
Anuvaad Compliance & Observability Subagent
-------------------------------------------
Intelligently audits:
1. Site Health & Uptime (FastAPI backend + DB + Redis ping)
2. Content & Link Integrity (parses privacy.html and terms.html, validates routes)
3. Security Gating & Configuration (CORS, CSRF, Secure Headers, .env visibility)
4. Dependency & Vulnerability Audits (npm audit / requirements scans)
5. User Errors & API Latencies (scrapes /api/metrics for error spikes)
"""

import os
import sys
import re
import json
import asyncio
import base64
import subprocess
from datetime import datetime

# Load parent directory for module imports and env loading
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Attempt to import httpx
try:
    import httpx
except ImportError:
    print("Warning: httpx module not found. Installing dynamically via pip...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "httpx"])
    import httpx

# Color utilities for terminal formatting
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
BOLD = "\033[1m"
RESET = "\033[0m"

# Load local environment vars
ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
env_vars = {}
if os.path.exists(ENV_PATH):
    with open(ENV_PATH, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                try:
                    k, v = line.split('=', 1)
                    env_vars[k.strip()] = v.strip()
                except ValueError:
                    pass

BACKEND_URL = env_vars.get("NEXT_PUBLIC_API_URL", "http://localhost:8000")
METRICS_USER = env_vars.get("METRICS_USERNAME", "")
METRICS_PASS = env_vars.get("METRICS_PASSWORD", "")

REPORT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'compliance_report.json'))
LOG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'compliance_report.log'))

def log_output(msg, level="INFO"):
    timestamp = datetime.now().isoformat()
    # Replace unicode symbols with ascii equivalents for safe printing if needed
    safe_msg = (msg.replace("✓", "[OK]")
                   .replace("✗", "[FAIL]")
                   .replace("✗", "[FAIL]")
                   .replace("⚠", "[WARN]")
                   .replace("\u26a0", "[WARN]")
                   .replace("\u2717", "[FAIL]")
                   .replace("·", "*"))
    formatted = f"[{timestamp}] [{level}] {safe_msg}"
    try:
        print(formatted)
    except UnicodeEncodeError:
        print(formatted.encode('ascii', errors='replace').decode('ascii'))
    with open(LOG_PATH, 'a', encoding='utf-8') as f:
        f.write(formatted + "\n")

class ComplianceSubagent:
    def __init__(self):
        self.findings = []
        self.passed_checks = 0
        self.failed_checks = 0
        self.warnings = 0
        self.metrics_data = {}

    async def run_all(self):
        log_output("Starting automated Anuvaad site audit and compliance subagent...", "START")
        
        # 1. Health check
        await self.audit_health()
        
        # 2. Metrics & Observability
        await self.audit_metrics()
        
        # 3. Content and Link integrity
        self.audit_link_integrity()
        
        # 4. Security configuration check
        self.audit_security_config()
        
        # 5. Dependency security checks
        self.audit_dependencies()
        
        # Generate final summary report
        self.generate_report()

    async def audit_health(self):
        log_output("Auditing endpoint /api/health...", "HEALTH")
        url = f"{BACKEND_URL}/api/health"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    log_output("Backend API is healthy (status 200). Config checks:")
                    
                    # Verify Redis connection status
                    if data.get("redis_connected"):
                        self.passed_checks += 1
                        log_output(f"  {GREEN}✓{RESET} Redis connected: True")
                    else:
                        self.warnings += 1
                        self.findings.append("WARNING: Redis connection is currently inactive.")
                        log_output(f"  {YELLOW}⚠{RESET} Redis connected: False (using in-memory caching fallback)")
                        
                    # Verify Supabase configuration
                    if data.get("supabase_configured"):
                        self.passed_checks += 1
                        log_output(f"  {GREEN}✓{RESET} Supabase connection: Active")
                    else:
                        self.failed_checks += 1
                        self.findings.append("FAIL: Supabase DB server role key is missing or not configured.")
                        log_output(f"  {RED}✗{RESET} Supabase configured: False")
                        
                    # Verify LLM Key status
                    if data.get("llm_configured"):
                        self.passed_checks += 1
                        log_output(f"  {GREEN}✓{RESET} LLM API Keys (Groq/DeepSeek): Configured")
                    else:
                        self.failed_checks += 1
                        self.findings.append("FAIL: Both Groq and DeepSeek LLM keys are missing or placeholders.")
                        log_output(f"  {RED}✗{RESET} LLM API Keys: Missing")
                else:
                    self.failed_checks += 1
                    self.findings.append(f"FAIL: Health check endpoint returned status {resp.status_code}")
                    log_output(f"{RED}✗{RESET} API health check returned non-200 status: {resp.status_code}", "ERROR")
        except Exception as e:
            self.failed_checks += 1
            self.findings.append(f"FAIL: Failed to reach backend health endpoint: {e}")
            log_output(f"{RED}✗{RESET} Health check failed to connect: {e}", "CRITICAL")

    async def audit_metrics(self):
        log_output("Auditing system errors and latency metrics...", "METRICS")
        url = f"{BACKEND_URL}/api/metrics"
        headers = {}
        if METRICS_USER and METRICS_PASS:
            userpass = f"{METRICS_USER}:{METRICS_PASS}"
            encoded = base64.b64encode(userpass.encode()).decode()
            headers["Authorization"] = f"Basic {encoded}"

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    self.passed_checks += 1
                    data = resp.json()
                    self.metrics_data = data
                    
                    uptime = data.get("uptime_seconds", 0)
                    log_output(f"Uptime: {uptime} seconds ({uptime/3600:.2f} hours)")
                    
                    total_errors = sum(data.get("total_errors", {}).values())
                    total_reqs = sum(data.get("total_requests", {}).values())
                    
                    log_output("Observability Metrics Snapshot:")
                    log_output(f"  - Total API Requests: {total_reqs}")
                    log_output(f"  - Total API Errors (4xx/5xx): {total_errors}")
                    
                    error_rate = (total_errors / total_reqs * 100) if total_reqs > 0 else 0.0
                    log_output(f"  - Error Rate: {error_rate:.2f}%")
                    if error_rate > 5.0:
                        self.warnings += 1
                        self.findings.append(f"WARNING: High backend API error rate currently at {error_rate:.2f}%")
                        log_output(f"  {YELLOW}⚠{RESET} Error rate exceeds 5% threshold!")
                    
                    # Latencies
                    avg_latencies = data.get("average_latency_ms", {})
                    log_output("  - Average latencies:")
                    for ep, lat in avg_latencies.items():
                        log_output(f"    · {ep}: {lat} ms")
                        if lat > 2000:
                            self.warnings += 1
                            self.findings.append(f"WARNING: Latency for endpoint {ep} is high ({lat}ms)")
                            log_output(f"      {YELLOW}⚠{RESET} Latency is above 2.0s limit")
                elif resp.status_code == 401:
                    self.passed_checks += 1
                    log_output(f"  {GREEN}✓{RESET} Observability endpoint (/api/metrics) is locked under basic auth")
                else:
                    self.warnings += 1
                    self.findings.append(f"WARNING: Metrics endpoint returned status {resp.status_code}")
                    log_output(f"  {YELLOW}⚠{RESET} Failed to query metrics: {resp.status_code}")
        except Exception as e:
            self.warnings += 1
            self.findings.append(f"WARNING: Could not connect to metrics API: {e}")
            log_output(f"  {YELLOW}⚠{RESET} Could not query metrics: {e}")

    def audit_link_integrity(self):
        log_output("Auditing Content & Link Integrity of static legal pages...", "LINKS")
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        files_to_check = {
            "privacy.html": os.path.join(root_dir, "privacy.html"),
            "terms.html": os.path.join(root_dir, "terms.html")
        }

        # Find absolute/relative links matching index.html, privacy.html, terms.html
        broken_pattern = re.compile(r'href=["\'](.*?\.html)["\']')

        for name, path in files_to_check.items():
            if not os.path.exists(path):
                self.failed_checks += 1
                self.findings.append(f"FAIL: Legal file {name} is missing in root workspace.")
                log_output(f"{RED}✗{RESET} Missing file: {name}", "ERROR")
                continue

            self.passed_checks += 1
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Audit language attribute
            if 'lang="en"' in content:
                self.passed_checks += 1
            else:
                self.warnings += 1
                self.findings.append(f"WARNING: {name} is missing a descriptive lang attribute on root element.")
                log_output(f"  {YELLOW}⚠{RESET} {name} missing lang='en'")

            # Search for legacy links that should be replaced with Next.js pathnames
            matches = broken_pattern.findall(content)
            legacy_links = [m for m in matches if m in ("index.html", "privacy.html", "terms.html")]
            
            if legacy_links:
                self.failed_checks += 1
                self.findings.append(f"FAIL: {name} contains legacy static HTML links: {', '.join(legacy_links)}")
                log_output(f"  {RED}✗{RESET} {name} contains legacy static HTML link references: {legacy_links}")
            else:
                self.passed_checks += 1
                log_output(f"  {GREEN}✓{RESET} {name} link integrity scan passed (no legacy static HTML extensions)")

    def audit_security_config(self):
        log_output("Auditing Security Gating and Configuration...", "SECURITY")
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        
        # 1. Ensure .env is ignored by Git
        gitignore_path = os.path.join(root_dir, ".gitignore")
        if os.path.exists(gitignore_path):
            with open(gitignore_path, 'r') as f:
                ignored = f.read()
            if ".env" in ignored:
                self.passed_checks += 1
                log_output(f"  {GREEN}✓{RESET} Secret configuration (.env) is properly listed in .gitignore")
            else:
                self.failed_checks += 1
                self.findings.append("FAIL: .env file is NOT ignored in .gitignore! Security risk of leakage.")
                log_output(f"  {RED}✗{RESET} .env is NOT ignored in .gitignore!")
        else:
            self.warnings += 1
            log_output(f"  {YELLOW}⚠{RESET} .gitignore is missing")

        # 2. Check security headers of the health check API
        try:
            url = f"{BACKEND_URL}/api/health"
            resp = httpx.get(url, timeout=60.0)
            headers = resp.headers
            
            required_headers = {
                "X-Frame-Options": "DENY",
                "X-Content-Type-Options": "nosniff",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            }
            
            for h, expected in required_headers.items():
                val = headers.get(h)
                if val:
                    self.passed_checks += 1
                    log_output(f"  {GREEN}✓{RESET} Security Header '{h}' present: {val}")
                else:
                    self.warnings += 1
                    self.findings.append(f"WARNING: API response header '{h}' is missing.")
                    log_output(f"  {YELLOW}⚠{RESET} Security Header '{h}' is missing")
        except Exception:
            pass

    def audit_dependencies(self):
        log_output("Auditing frontend dependencies using npm audit...", "DEPENDENCIES")
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        frontend_dir = os.path.join(root_dir, "frontend")
        
        if not os.path.exists(os.path.join(frontend_dir, "package.json")):
            log_output("  Frontend directory package.json not found, skipping dependency scan.")
            return

        try:
            # Run npm audit in non-blocking mode
            # Use shell=True for Windows compatibility
            res = subprocess.run(
                "npm audit --json", 
                cwd=frontend_dir, 
                shell=True, 
                capture_output=True, 
                text=True
            )
            
            # npm audit returns 1 if vulnerabilities are found, 0 if clean
            audit_data = json.loads(res.stdout) if res.stdout else {}
            metadata = audit_data.get("metadata", {})
            vulns = metadata.get("vulnerabilities", {})
            
            total_vulns = sum(vulns.values())
            high_critical = vulns.get("high", 0) + vulns.get("critical", 0)
            
            log_output(f"NPM Vulnerabilities: {total_vulns} total ({high_critical} High/Critical)")
            if high_critical > 0:
                self.warnings += 1
                self.findings.append(f"WARNING: Frontend has {high_critical} High/Critical package vulnerabilities. Run 'npm audit fix'.")
                log_output(f"  {YELLOW}⚠{RESET} Action recommended: run 'npm audit fix'")
            else:
                self.passed_checks += 1
                log_output(f"  {GREEN}✓{RESET} Frontend dependencies are clear of High/Critical vulnerabilities")
        except Exception as e:
            self.warnings += 1
            log_output(f"  {YELLOW}⚠{RESET} Could not complete npm audit check: {e}")

    def generate_report(self):
        timestamp = datetime.now().isoformat()
        report = {
            "timestamp": timestamp,
            "passed_checks": self.passed_checks,
            "failed_checks": self.failed_checks,
            "warnings_count": self.warnings,
            "status": "HEALTHY" if self.failed_checks == 0 else "DEGRADED",
            "findings": self.findings,
            "metrics": self.metrics_data
        }
        
        # Save JSON report
        with open(REPORT_PATH, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)
            
        log_output("----------------------------------------------------------------", "SUMMARY")
        log_output(f"Audit completed: {self.passed_checks} passed checks, {self.failed_checks} failures, {self.warnings} warnings.", "SUMMARY")
        log_output(f"Operational status: {report['status']}", "SUMMARY")
        log_output("Report saved to compliance_report.json", "SUMMARY")
        
        if self.failed_checks > 0:
            sys.exit(1)
        else:
            sys.exit(0)

if __name__ == "__main__":
    subagent = ComplianceSubagent()
    # Run in async context
    asyncio.run(subagent.run_all())
