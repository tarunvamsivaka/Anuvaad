[CmdletBinding()]
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $repoRoot "frontend"

function Invoke-Stage {
    param(
        [Parameter(Mandatory)] [string] $Name,
        [Parameter(Mandatory)] [string] $Executable,
        [Parameter(Mandatory)] [string[]] $Arguments,
        [Parameter(Mandatory)] [string] $WorkingDirectory
    )

    Write-Host "`n== $Name ==" -ForegroundColor Cyan
    Push-Location $WorkingDirectory
    try {
        & $Executable @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "$Name failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}

$localPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if (Test-Path $localPython) {
    $pythonExecutable = $localPython
}
elseif ($pythonCommand) {
    $pythonExecutable = $pythonCommand.Source
}
else {
    throw "Python 3.11+ is required. Install the backend dependencies in your active environment first."
}
if (-not (Test-Path (Join-Path $frontendRoot "node_modules"))) {
    throw "Frontend dependencies are missing. Run 'npm ci' in frontend/ first."
}

# CI-only placeholder values let the test app initialize without exposing or
# requiring real service credentials. Restore the caller's environment below.
$testEnvironment = @{
    TESTING = "true"
    GROQ_API_KEY = "test_key_for_ci"
    DEEPSEEK_API_KEY = "test_key_for_ci"
    SUPABASE_URL = "https://placeholder.supabase.co"
    SUPABASE_ANON_KEY = "placeholder_key_for_ci"
    SUPABASE_SERVICE_ROLE_KEY = "placeholder_service_key_for_ci"
    SUPABASE_JWT_SECRET = "test_supabase_jwt_secret_32bytes_minimum_length"
    DATABASE_URL = "sqlite+aiosqlite:///:memory:"
    REDIS_URL = "redis://localhost:6379"
}
$previousEnvironment = @{}
foreach ($name in $testEnvironment.Keys) {
    $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
    [Environment]::SetEnvironmentVariable($name, $testEnvironment[$name], "Process")
}

try {
    Invoke-Stage "Python lint" $pythonExecutable @("-m", "ruff", "check", "main.py", "app/", "tests/", "--select", "E,F,W", "--ignore", "E501,F401") $repoRoot
    Invoke-Stage "Python format check" $pythonExecutable @("-m", "ruff", "format", "--check", "main.py", "app/", "tests/", "alembic/") $repoRoot
    Invoke-Stage "Backend tests" $pythonExecutable @("-m", "pytest", "tests/", "-q", "-p", "no:cacheprovider", "--ignore=tests/test_production.py") $repoRoot

    Invoke-Stage "Frontend lint" "npm" @("run", "lint") $frontendRoot
    Invoke-Stage "Frontend TypeScript" "npx" @("tsc", "--noEmit") $frontendRoot
    Invoke-Stage "Frontend unit tests" "npm" @("test", "--", "--run") $frontendRoot
    if (-not $SkipBuild) {
        Invoke-Stage "Frontend production build" "npm" @("run", "build") $frontendRoot
    }

    Write-Host "`nVerification passed. PostgreSQL migration CI and live-service/release gates are separate." -ForegroundColor Green
}
finally {
    foreach ($name in $testEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($name, $previousEnvironment[$name], "Process")
    }
}
