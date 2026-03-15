param(
  [switch]$Refresh
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$browserPath = Join-Path $repoRoot 'playwright-browsers'
$npmCachePath = Join-Path $repoRoot '.npm-cache'
$legacyBrowserPath = Join-Path $env:LOCALAPPDATA 'ms-playwright'

New-Item -ItemType Directory -Path $browserPath -Force | Out-Null
New-Item -ItemType Directory -Path $npmCachePath -Force | Out-Null

$env:PLAYWRIGHT_BROWSERS_PATH = $browserPath
$env:npm_config_cache = $npmCachePath

$hasLocalBrowser = Get-ChildItem -Path $browserPath -Filter 'chromium-*' -ErrorAction SilentlyContinue
if (-not $hasLocalBrowser -and (Test-Path $legacyBrowserPath)) {
  robocopy $legacyBrowserPath $browserPath /E /XO /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "Failed to seed Playwright browsers from '$legacyBrowserPath' (robocopy exit code $LASTEXITCODE)."
  }
}

$chrome = Get-ChildItem -Path $browserPath -Recurse -Filter 'chrome.exe' | Select-Object -First 1

if ($Refresh -or -not $chrome) {
  Push-Location $repoRoot
  try {
    & npx playwright install chromium
    if ($LASTEXITCODE -ne 0) {
      throw "Playwright install failed with exit code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
}

$chrome = Get-ChildItem -Path $browserPath -Recurse -Filter 'chrome.exe' | Select-Object -First 1
if (-not $chrome) {
  throw "Chromium executable was not found under '$browserPath' after install."
}

Write-Output "PLAYWRIGHT_BROWSERS_PATH=$browserPath"
Write-Output "npm_config_cache=$npmCachePath"
Write-Output "CHROMIUM_EXECUTABLE=$($chrome.FullName)"
