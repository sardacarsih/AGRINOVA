param(
    [string]$ReleaseName = "",
    [switch]$SkipBuild,
    [switch]$ApkOnly,
    [switch]$AabOnly
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message"
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseRoot = Join-Path $projectRoot "release"

if ([string]::IsNullOrWhiteSpace($ReleaseName)) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $ReleaseName = "mobile-production-$stamp"
}

$buildApk = $true
$buildAab = $true

if ($ApkOnly -and $AabOnly) {
    throw "Use only one of -ApkOnly or -AabOnly."
}

if ($ApkOnly) {
    $buildAab = $false
}

if ($AabOnly) {
    $buildApk = $false
}

$prodEnvPath = Join-Path $projectRoot "env/prod.json"
if (-not (Test-Path $prodEnvPath)) {
    throw "Required file not found: '$prodEnvPath'"
}

$flutterCmd = Get-Command flutter -ErrorAction SilentlyContinue
if (-not $flutterCmd) {
    throw "Flutter CLI not found in PATH. Install Flutter and ensure 'flutter' is available."
}

$releaseDir = Join-Path $releaseRoot $ReleaseName
$zipPath = Join-Path $releaseRoot "$ReleaseName.zip"

if (Test-Path $releaseDir) {
    Remove-Item -Path $releaseDir -Recurse -Force
}
New-Item -Path $releaseDir -ItemType Directory -Force | Out-Null

Push-Location $projectRoot
try {
    if (-not $SkipBuild) {
        Write-Step "Running flutter pub get"
        flutter pub get
        if ($LASTEXITCODE -ne 0) {
            throw "flutter pub get failed with exit code $LASTEXITCODE."
        }

        Write-Step "Preparing release build configuration"
        flutter build apk --release --config-only --dart-define-from-file=env/prod.json
        if ($LASTEXITCODE -ne 0) {
            throw "flutter build apk --config-only failed with exit code $LASTEXITCODE."
        }

        if ($buildApk) {
            Write-Step "Building release APK (env/prod.json)"
            flutter build apk --release --dart-define-from-file=env/prod.json
            if ($LASTEXITCODE -ne 0) {
                throw "flutter build apk failed with exit code $LASTEXITCODE."
            }
        }

        if ($buildAab) {
            Write-Step "Building release AAB (env/prod.json)"
            flutter build appbundle --release --dart-define-from-file=env/prod.json
            if ($LASTEXITCODE -ne 0) {
                throw "flutter build appbundle failed with exit code $LASTEXITCODE."
            }
        }
    } else {
        Write-Step "Skipping build step (-SkipBuild)"
    }
}
finally {
    Pop-Location
}

$artifactFiles = @()

if ($buildApk) {
    $apkSource = Join-Path $projectRoot "build/app/outputs/flutter-apk/app-release.apk"
    if (-not (Test-Path $apkSource)) {
        throw "APK artifact not found: '$apkSource'"
    }
    $apkDest = Join-Path $releaseDir "agrinova-mobile-release.apk"
    Copy-Item -Path $apkSource -Destination $apkDest -Force
    $artifactFiles += $apkDest
}

if ($buildAab) {
    $aabSource = Join-Path $projectRoot "build/app/outputs/bundle/release/app-release.aab"
    if (-not (Test-Path $aabSource)) {
        throw "AAB artifact not found: '$aabSource'"
    }
    $aabDest = Join-Path $releaseDir "agrinova-mobile-release.aab"
    Copy-Item -Path $aabSource -Destination $aabDest -Force
    $artifactFiles += $aabDest
}

$mappingSource = Join-Path $projectRoot "build/app/outputs/mapping/release/mapping.txt"
if (Test-Path $mappingSource) {
    Copy-Item -Path $mappingSource -Destination (Join-Path $releaseDir "proguard-mapping.txt") -Force
}

Copy-Item -Path $prodEnvPath -Destination (Join-Path $releaseDir "prod.json.example") -Force

$checksumLines = @()
foreach ($file in $artifactFiles) {
    $hash = Get-FileHash -Path $file -Algorithm SHA256
    $checksumLines += "$($hash.Hash) *$($hash.Path | Split-Path -Leaf)"
}
Set-Content -Path (Join-Path $releaseDir "checksums.sha256") -Encoding ASCII -Value ($checksumLines -join [Environment]::NewLine)

$readme = @"
Agrinova mobile production artifact
==================================

Contents:
- Release APK/AAB (depending on selected mode)
- checksums.sha256
- proguard-mapping.txt (if generated)
- prod.json.example

Build flags:
- SkipBuild: $SkipBuild
- ApkOnly: $ApkOnly
- AabOnly: $AabOnly

Notes:
1. Use 'prod.json.example' as reference for dart-define values.
2. Upload '.aab' to Play Console for production distribution.
3. Keep 'proguard-mapping.txt' for crash symbolication.
"@
Set-Content -Path (Join-Path $releaseDir "README.txt") -Encoding UTF8 -Value $readme

if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}
Compress-Archive -Path (Join-Path $releaseDir "*") -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "Mobile release artifact ready:"
Write-Host "  Folder: $releaseDir"
Write-Host "  Zip:    $zipPath"
