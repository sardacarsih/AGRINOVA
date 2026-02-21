# Agrinova API Server Startup Manager - PowerShell Version

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   Agrinova API Server Startup Manager" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Resolve-Path (Join-Path $scriptDir "..")
$apiDir = Join-Path $rootDir "apps\\golang"
if (-not (Test-Path $apiDir)) {
    Write-Host "ERROR: API directory not found: $apiDir" -ForegroundColor Red
    exit 1
}

Set-Location $apiDir

# Check if port 8080 is in use and kill if necessary
Write-Host "Checking port 8080 availability..." -ForegroundColor Yellow

try {
    $portCheck = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
    if ($portCheck) {
        Write-Host "Port 8080 is in use. Attempting to free it..." -ForegroundColor Yellow

        $processId = $portCheck.OwningProcess
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

        if ($process) {
            Write-Host "Found process: $($process.ProcessName) (PID: $processId)" -ForegroundColor Yellow
            Write-Host "Stopping process..." -ForegroundColor Yellow
            Stop-Process -Id $processId -Force
            Write-Host "Process stopped successfully" -ForegroundColor Green
            Start-Sleep -Seconds 2
        }
    } else {
        Write-Host "Port 8080 is available" -ForegroundColor Green
    }
} catch {
    Write-Host "Port 8080 check failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting Go GraphQL API Server..." -ForegroundColor Green
Write-Host "   Server URL: http://localhost:8080/graphql" -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Go is not installed or not on PATH." -ForegroundColor Red
    exit 1
}

# Start the API server
try {
    & go run ./cmd/server/main.go
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to start API server: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure Go is installed and the module dependencies are downloaded." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
