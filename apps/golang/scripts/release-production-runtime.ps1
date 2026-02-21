param(
    [ValidateSet("linux", "windows", "darwin")]
    [string]$TargetOS = "linux",

    [ValidateSet("amd64", "arm64")]
    [string]$TargetArch = "amd64",

    [string]$ReleaseName = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ReleaseName)) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $ReleaseName = "backend-$TargetOS-$TargetArch-$stamp"
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$packageScriptPath = Join-Path $PSScriptRoot "package-binaries.ps1"

if (-not (Test-Path $packageScriptPath)) {
    throw "Required script not found: '$packageScriptPath'"
}

Write-Host "==> Building backend production artifact ($TargetOS/$TargetArch)"
& $packageScriptPath -TargetOS $TargetOS -TargetArch $TargetArch -ReleaseName $ReleaseName

if (-not $?) {
    throw "Backend release packaging failed."
}

$releaseRoot = Join-Path $projectRoot "release"
$releaseDir = Join-Path $releaseRoot $ReleaseName
$zipPath = Join-Path $releaseRoot "$ReleaseName.zip"

Write-Host ""
Write-Host "Backend release artifact ready:"
Write-Host "  Folder: $releaseDir"
Write-Host "  Zip:    $zipPath"

