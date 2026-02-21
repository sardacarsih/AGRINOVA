param(
    [string]$ReleaseName = "web-standalone"
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$standaloneSourceDir = Join-Path $projectRoot ".next/standalone"
$staticSourceDir = Join-Path $projectRoot ".next/static"
$publicSourceDir = Join-Path $projectRoot "public"

$releaseRoot = Join-Path $projectRoot "release"
$releaseDir = Join-Path $releaseRoot $ReleaseName
$zipPath = Join-Path $releaseRoot "$ReleaseName.zip"

if (-not (Test-Path $standaloneSourceDir)) {
    throw "Standalone build not found at '$standaloneSourceDir'. Run 'npm run build:standalone' first."
}

if (-not (Test-Path $staticSourceDir)) {
    throw "Static assets not found at '$staticSourceDir'. Run 'npm run build:standalone' first."
}

if (Test-Path $releaseDir) {
    Remove-Item -Path $releaseDir -Recurse -Force
}

New-Item -Path $releaseDir -ItemType Directory -Force | Out-Null
Copy-Item -Path (Join-Path $standaloneSourceDir "*") -Destination $releaseDir -Recurse -Force

$runtimeDir = Join-Path $releaseDir "apps/web"
if (-not (Test-Path $runtimeDir)) {
    $runtimeDir = $releaseDir
}

$runtimeNextDir = Join-Path $runtimeDir ".next"
New-Item -Path $runtimeNextDir -ItemType Directory -Force | Out-Null

# Standalone output does not include static/public by default.
Copy-Item -Path $staticSourceDir -Destination $runtimeNextDir -Recurse -Force

if (Test-Path $publicSourceDir) {
    Copy-Item -Path $publicSourceDir -Destination $runtimeDir -Recurse -Force
}

# Remove environment files from artifact.
$sensitiveEnvFiles = @(".env", ".env.local", ".env.production", ".env.development")
foreach ($envFile in $sensitiveEnvFiles) {
    $envPath = Join-Path $runtimeDir $envFile
    if (Test-Path $envPath) {
        Remove-Item -Path $envPath -Force
    }
}

# Keep a safe template if available.
$envExamplePath = Join-Path $projectRoot ".env.example"
if (Test-Path $envExamplePath) {
    Copy-Item -Path $envExamplePath -Destination (Join-Path $runtimeDir ".env.example") -Force
}

$runCommand = "node server.js"
$nestedServerPath = Join-Path $releaseDir "apps/web/server.js"
if (Test-Path $nestedServerPath) {
    $runCommand = "node apps/web/server.js"
}

$readme = @"
Agrinova web standalone artifact
================================

Run:
1. Upload this folder to server.
2. Copy .env.example to .env, then update production values.
3. Start application with:
   $runCommand

Requirements:
- Node.js 18 or newer
- This artifact contains runtime files only (no full source tree)
"@

Set-Content -Path (Join-Path $releaseDir "README.txt") -Value $readme -Encoding UTF8

if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

Compress-Archive -Path (Join-Path $releaseDir "*") -DestinationPath $zipPath -Force

Write-Host "Standalone web artifact created:"
Write-Host "  Folder: $releaseDir"
Write-Host "  Zip:    $zipPath"

