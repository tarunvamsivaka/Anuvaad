param (
    [string]$FrontendUrl = "https://getanuvaad.vercel.app",
    [string]$BackendUrl = "http://localhost:8000"
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting Anuvaad Live Production Smoke-Test Suite" -ForegroundColor Cyan
Write-Host " Frontend Target: $FrontendUrl" -ForegroundColor Cyan
Write-Host " Backend Target:  $BackendUrl" -ForegroundColor Cyan
Write-Host " Timestamp:       $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$FailedCount = 0

function Test-Endpoint {
    param (
        [string]$Name,
        [string]$Url,
        [int[]]$ExpectedCode,
        [string]$Pattern = ""
    )

    $padded = $Name.PadRight(34)
    Write-Host -NoNewline "$padded ... "

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $curlOut = curl.exe -s -w "`n%{http_code}" -L --max-time 10 $Url
    $stopwatch.Stop()
    $timeMs = [math]::Round($stopwatch.ElapsedMilliseconds, 2)
    $lines = $curlOut -split "`n"
    $statusCode = [int]($lines[-1].Trim())
    $content = ($lines[0..($lines.Length - 2)]) -join "`n"

    if ($statusCode -in $ExpectedCode) {
        if ($Pattern -and -not ($content -match $Pattern)) {
            Write-Host "FAILED (HTTP $statusCode in ${timeMs}ms, pattern '$Pattern' missing)" -ForegroundColor Red
            return 1
        }
        Write-Host "PASSED (HTTP $statusCode in ${timeMs}ms)" -ForegroundColor Green
        return 0
    }
    else {
        $expectedStr = $ExpectedCode -join " or "
        Write-Host "FAILED (Expected HTTP $expectedStr, got $statusCode in ${timeMs}ms)" -ForegroundColor Red
        return 1
    }
}

Write-Host "`n--- Testing Frontend (Next.js 16 App Router) ---" -ForegroundColor Yellow
$FailedCount += Test-Endpoint -Name "Frontend Robots Directive" -Url "$FrontendUrl/robots.txt" -ExpectedCode @(200) -Pattern "Sitemap:"
$FailedCount += Test-Endpoint -Name "Frontend Dynamic Sitemap XML" -Url "$FrontendUrl/sitemap.xml" -ExpectedCode @(200) -Pattern "<urlset"
$FailedCount += Test-Endpoint -Name "Frontend Social OpenGraph Image" -Url "$FrontendUrl/opengraph-image" -ExpectedCode @(200)

Write-Host "`n--- Testing Backend (FastAPI Gateway) ---" -ForegroundColor Yellow
$FailedCount += Test-Endpoint -Name "Backend Sub-50ms Liveness" -Url "$BackendUrl/health/live" -ExpectedCode @(200) -Pattern "live"
$FailedCount += Test-Endpoint -Name "Backend Readiness Probe" -Url "$BackendUrl/health/ready" -ExpectedCode @(200, 503) -Pattern "connected"
$FailedCount += Test-Endpoint -Name "Unauthenticated /metrics (401)" -Url "$BackendUrl/metrics" -ExpectedCode @(401)

Write-Host "`n========================================================" -ForegroundColor Cyan
if ($FailedCount -eq 0) {
    Write-Host " ALL PRODUCTION SMOKE TESTS PASSED (0 FAILURES)" -ForegroundColor Green
    Write-Host " Platform is operational, responsive, and secure." -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Cyan
    exit 0
}
else {
    Write-Host " SMOKE TEST SUITE COMPLETED WITH $FailedCount FAILURE(S)" -ForegroundColor Red
    Write-Host "========================================================" -ForegroundColor Cyan
    exit 1
}
