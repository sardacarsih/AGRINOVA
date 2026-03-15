param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Arguments
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$browserPath = Join-Path $repoRoot 'playwright-browsers'
$npmCachePath = Join-Path $repoRoot '.npm-cache'

if (-not (Test-Path $browserPath)) {
  throw "Playwright browser cache is missing. Run 'npm run playwright:install:chromium' first."
}

$env:PLAYWRIGHT_BROWSERS_PATH = $browserPath
$env:npm_config_cache = $npmCachePath

$playwrightPackage = Get-ChildItem -Path (Join-Path $npmCachePath '_npx') -Directory -ErrorAction SilentlyContinue |
  ForEach-Object { Join-Path $_.FullName 'node_modules\playwright\package.json' } |
  Where-Object { Test-Path $_ } |
  Select-Object -First 1

if ($playwrightPackage) {
  $playwrightNodeModules = Split-Path (Split-Path $playwrightPackage -Parent) -Parent
  if ([string]::IsNullOrWhiteSpace($env:NODE_PATH)) {
    $env:NODE_PATH = $playwrightNodeModules
  } else {
    $env:NODE_PATH = "$playwrightNodeModules;$env:NODE_PATH"
  }
}

Push-Location $repoRoot
try {
  & npx playwright @Arguments
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
