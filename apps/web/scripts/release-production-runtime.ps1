param(
    [string]$ReleaseName = "",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message"
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envLocalPath = Join-Path $projectRoot ".env.local"
$envLocalBackupPath = Join-Path $projectRoot ".env.local.__bak_build"
$envProductionPath = Join-Path $projectRoot ".env.production"

if ([string]::IsNullOrWhiteSpace($ReleaseName)) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $ReleaseName = "web-standalone-$stamp"
}

$restoreEnvLocal = $false
$currentLocation = Get-Location

try {
    Set-Location $projectRoot

    if (-not (Test-Path $envProductionPath)) {
        throw "Required file '.env.production' not found at '$envProductionPath'."
    }

    if (Test-Path $envLocalBackupPath) {
        Remove-Item -Path $envLocalBackupPath -Force
    }

    if (Test-Path $envLocalPath) {
        Write-Step "Temporarily disabling .env.local for production build"
        Rename-Item -Path $envLocalPath -NewName ".env.local.__bak_build" -Force
        $restoreEnvLocal = $true
    }

    if (-not $SkipBuild) {
        Write-Step "Building standalone production artifact"
        npm run build:standalone
        if ($LASTEXITCODE -ne 0) {
            throw "Standalone build failed with exit code $LASTEXITCODE."
        }
    } else {
        Write-Step "Skipping build step (-SkipBuild)"
    }

    Write-Step "Packaging standalone artifact"
    & (Join-Path $PSScriptRoot "package-standalone.ps1") -ReleaseName $ReleaseName
    if (-not $?) {
        throw "Packaging standalone artifact failed."
    }

    $releaseRoot = Join-Path $projectRoot "release"
    $releaseDir = Join-Path $releaseRoot $ReleaseName
    $zipPath = Join-Path $releaseRoot "$ReleaseName.zip"

    if (-not (Test-Path $releaseDir)) {
        throw "Release folder not found: '$releaseDir'."
    }

    $runtimeDir = Join-Path $releaseDir "apps/web"
    if (-not (Test-Path $runtimeDir)) {
        $runtimeDir = $releaseDir
    }

    Write-Step "Injecting environment templates into release bundle"
    Copy-Item -Path $envProductionPath -Destination (Join-Path $runtimeDir ".env.example") -Force
    Copy-Item -Path $envProductionPath -Destination (Join-Path $runtimeDir ".env.production.template") -Force

    Write-Step "Rebuilding zip with updated env templates"
    if (Test-Path $zipPath) {
        Remove-Item -Path $zipPath -Force
    }
    Compress-Archive -Path (Join-Path $releaseDir "*") -DestinationPath $zipPath -Force

    Write-Host ""
    Write-Host "Release artifact ready:"
    Write-Host "  Folder: $releaseDir"
    Write-Host "  Zip:    $zipPath"
    Write-Host ""
    Write-Host "Server start command:"
    Write-Host "  node apps/web/server.js"
} finally {
    if ($restoreEnvLocal -and (Test-Path $envLocalBackupPath)) {
        Write-Step "Restoring .env.local"
        Rename-Item -Path $envLocalBackupPath -NewName ".env.local" -Force
    }
    Set-Location $currentLocation
}
