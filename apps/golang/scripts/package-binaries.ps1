param(
    [ValidateSet("linux", "windows", "darwin")]
    [string]$TargetOS = "linux",

    [ValidateSet("amd64", "arm64")]
    [string]$TargetArch = "amd64",

    [string]$ReleaseName,

    [string]$Version = "dev",

    [switch]$SkipSeed,

    [switch]$SkipEnvTemplate
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ReleaseName)) {
    $ReleaseName = "backend-$TargetOS-$TargetArch"
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseRoot = Join-Path $projectRoot "release"
$releaseDir = Join-Path $releaseRoot $ReleaseName
$zipPath = Join-Path $releaseRoot "$ReleaseName.zip"
$exeExt = if ($TargetOS -eq "windows") { ".exe" } else { "" }

if (Test-Path $releaseDir) {
    Remove-Item -Path $releaseDir -Recurse -Force
}

New-Item -Path $releaseDir -ItemType Directory -Force | Out-Null

$buildTargets = @(
    @{ Name = "agrinova-server"; Path = "./cmd/server" },
    @{ Name = "agrinova-migrate"; Path = "./cmd/migrate" }
)

if (-not $SkipSeed) {
    $buildTargets += @{ Name = "agrinova-seed"; Path = "./cmd/seed" }
}

Push-Location $projectRoot
try {
    $oldGOOS = $env:GOOS
    $oldGOARCH = $env:GOARCH
    $oldCGO = $env:CGO_ENABLED

    $env:GOOS = $TargetOS
    $env:GOARCH = $TargetArch
    $env:CGO_ENABLED = "0"

    foreach ($target in $buildTargets) {
        $outputPath = Join-Path $releaseDir "$($target.Name)$exeExt"
        Write-Host "Building $($target.Name)$exeExt for $TargetOS/$TargetArch (version=$Version)..."
        go build -trimpath -ldflags "-s -w -X main.version=$Version" -o $outputPath $target.Path
    }

    if (-not $SkipEnvTemplate) {
        $envTemplateCandidates = @(".env.production.example", ".env.example", ".env.production")
        foreach ($candidate in $envTemplateCandidates) {
            $candidatePath = Join-Path $projectRoot $candidate
            if (Test-Path $candidatePath) {
                Copy-Item -Path $candidatePath -Destination (Join-Path $releaseDir ".env.example") -Force
                break
            }
        }
    }

    if ($TargetOS -eq "windows") {
        Set-Content -Path (Join-Path $releaseDir "start-server.cmd") -Encoding ASCII -Value "@echo off`r`ncd /d %~dp0`r`nagrinova-server.exe`r`n"
        Set-Content -Path (Join-Path $releaseDir "run-migrate.cmd") -Encoding ASCII -Value "@echo off`r`ncd /d %~dp0`r`nagrinova-migrate.exe %*`r`n"
        if (-not $SkipSeed) {
            Set-Content -Path (Join-Path $releaseDir "run-seed.cmd") -Encoding ASCII -Value "@echo off`r`ncd /d %~dp0`r`nagrinova-seed.exe %*`r`n"
        }
    } else {
        $startScript = @'
#!/usr/bin/env sh
set -eu
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$DIR"
exec ./agrinova-server
'@
        $migrateScript = @'
#!/usr/bin/env sh
set -eu
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$DIR"
exec ./agrinova-migrate "$@"
'@
        Set-Content -Path (Join-Path $releaseDir "start-server.sh") -Encoding ASCII -Value $startScript
        Set-Content -Path (Join-Path $releaseDir "run-migrate.sh") -Encoding ASCII -Value $migrateScript
        if (-not $SkipSeed) {
            $seedScript = @'
#!/usr/bin/env sh
set -eu
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$DIR"
exec ./agrinova-seed "$@"
'@
            Set-Content -Path (Join-Path $releaseDir "run-seed.sh") -Encoding ASCII -Value $seedScript
        }
    }

    $contentLines = @(
        "- agrinova-server$exeExt",
        "- agrinova-migrate$exeExt"
    )
    if (-not $SkipSeed) {
        $contentLines += "- agrinova-seed$exeExt"
    }
    if (-not $SkipEnvTemplate) {
        $contentLines += "- .env.example"
    }
    $contentsBlock = $contentLines -join "`r`n"

    $usageLine = "5. Run migration first, then server."
    if (-not $SkipSeed) {
        $usageLine = "5. Run migration first, then seed (optional), then server."
    }
    $envUsageLine = "2. Create .env file with production values."
    if ($SkipEnvTemplate) {
        $envUsageLine = "2. Create .env file on server from your secure config source (no template included in artifact)."
    }

    $readme = @"
Agrinova backend binary artifact ($TargetOS/$TargetArch)
========================================================

Contents:
$contentsBlock

Usage:
1. Copy files to server directory.
2. $envUsageLine
3. Set AGRINOVA_FCM_CREDENTIALS_FILE in .env to an absolute JSON credentials path.
4. Place firebase-service-account.json on server (outside artifact zip is recommended).
$usageLine
"@
    Set-Content -Path (Join-Path $releaseDir "README.txt") -Encoding UTF8 -Value $readme
}
finally {
    if ($null -ne $oldGOOS) { $env:GOOS = $oldGOOS } else { Remove-Item Env:GOOS -ErrorAction SilentlyContinue }
    if ($null -ne $oldGOARCH) { $env:GOARCH = $oldGOARCH } else { Remove-Item Env:GOARCH -ErrorAction SilentlyContinue }
    if ($null -ne $oldCGO) { $env:CGO_ENABLED = $oldCGO } else { Remove-Item Env:CGO_ENABLED -ErrorAction SilentlyContinue }
    Pop-Location
}

if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

Compress-Archive -Path (Join-Path $releaseDir "*") -DestinationPath $zipPath -Force

Write-Host "Backend artifact created:"
Write-Host "  Folder: $releaseDir"
Write-Host "  Zip:    $zipPath"
