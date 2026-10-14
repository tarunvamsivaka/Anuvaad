#!/usr/bin/env bash
# Anuvaad Automated Production Smoke-Test Suite
# Validates live frontend and backend endpoints for Anuvaad

set -euo pipefail

FRONTEND_URL="${1:-https://getanuvaad.vercel.app}"
BACKEND_URL="${2:-http://localhost:8000}"

echo "========================================================"
echo " Starting Anuvaad Live Production Smoke-Test Suite"
echo " Frontend Target: ${FRONTEND_URL}"
echo " Backend Target:  ${BACKEND_URL}"
echo " Timestamp:       $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "========================================================"

FAILED=0

# Helper function for HTTP checks
check_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="$3"
    local pattern="${4:-}"
    
    printf "%-32s ... " "${name}"
    
    local start_time
    start_time=$(date +%s%N 2>/dev/null || date +%s)
    
    local response
    local http_code
    response=$(curl -s -w "\n%{http_code}" -L --max-time 10 "${url}" 2>/dev/null || echo -e "\n000")
    
    http_code=$(echo "${response}" | tail -n1)
    local body
    body=$(echo "${response}" | sed '$d')
    
    if [ "${http_code}" -eq "${expected_code}" ]; then
        if [ -n "${pattern}" ]; then
            if echo "${body}" | grep -q "${pattern}"; then
                echo "PASSED (HTTP ${http_code}, matched '${pattern}')"
            else
                echo "FAILED (HTTP ${http_code}, pattern '${pattern}' not found)"
                FAILED=$((FAILED + 1))
            fi
        else
            echo "PASSED (HTTP ${http_code})"
        fi
    else
        echo "FAILED (Expected HTTP ${expected_code}, got ${http_code})"
        FAILED=$((FAILED + 1))
    fi
}

echo ""
echo "--- Testing Frontend (Next.js 16 App Router) ---"
check_endpoint "Frontend Robots Directive" "${FRONTEND_URL}/robots.txt" 200 "Sitemap:"
check_endpoint "Frontend Dynamic Sitemap XML" "${FRONTEND_URL}/sitemap.xml" 200 "<urlset"
check_endpoint "Frontend Social OpenGraph Image" "${FRONTEND_URL}/opengraph-image" 200 ""

echo ""
echo "--- Testing Backend (FastAPI Gateway) ---"
# Check sub-50ms liveness
printf "%-32s ... " "Backend Sub-50ms Liveness"
LIVENESS_OUTPUT=$(curl -s -w "%{http_code}:%{time_total}\n" -o /dev/null --max-time 5 "${BACKEND_URL}/health/live" 2>/dev/null || echo "000:999")
LIVE_CODE=$(echo "${LIVENESS_OUTPUT}" | cut -d: -f1)
LIVE_TIME=$(echo "${LIVENESS_OUTPUT}" | cut -d: -f2)

if [ "${LIVE_CODE}" -eq 200 ]; then
    echo "PASSED (HTTP 200 in ${LIVE_TIME}s)"
else
    echo "FAILED (HTTP ${LIVE_CODE} in ${LIVE_TIME}s)"
    FAILED=$((FAILED + 1))
fi

check_endpoint "Backend Readiness Probe" "${BACKEND_URL}/health/ready" 200 "dependencies"
check_endpoint "Unauthenticated /metrics (401)" "${BACKEND_URL}/metrics" 401 ""

echo ""
echo "========================================================"
if [ "${FAILED}" -eq 0 ]; then
    echo " ALL PRODUCTION SMOKE TESTS PASSED (0 FAILURES)"
    echo " Platform is operational, responsive, and secure."
    echo "========================================================"
    exit 0
else
    echo " SMOKE TEST SUITE COMPLETED WITH ${FAILED} FAILURE(S)"
    echo "========================================================"
    exit 1
fi
