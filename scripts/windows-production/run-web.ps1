param(
    [ValidateSet("production", "development")]
    [string]$Environment = "production",
    [string]$EnvFile = ""
)

$ErrorActionPreference = "Stop"

function Import-DotEnv {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path $Path)) {
        throw "Missing env file: $Path"
    }

    Get-Content -Path $Path | ForEach-Object {
        $line = $_.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
            return
        }

        if ($line.StartsWith("export ")) {
            $line = $line.Substring(7).Trim()
        }

        $parts = $line -split "=", 2
        if ($parts.Count -ne 2) {
            return
        }

        $key = $parts[0].Trim()
        $value = $parts[1].Trim()

        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

function Mirror-Directory {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination
    )

    if (-not (Test-Path $Source)) {
        throw "Source directory does not exist: $Source"
    }

    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    robocopy $Source $Destination /E /NFL /NDL /NJH /NJS /NP /R:2 /W:1 | Out-Null
    $code = $LASTEXITCODE
    if ($code -ge 8) {
        throw "robocopy failed from '$Source' to '$Destination' (exit code $code)"
    }
}

function Resolve-EnvPath {
    if (-not [string]::IsNullOrWhiteSpace($EnvFile)) {
        return $EnvFile
    }

    if ($Environment -eq "production") {
        return "D:\agrinova\web\config\.env"
    }

    $candidates = @(
        (Join-Path (Get-Location) ".env"),
        (Join-Path $PSScriptRoot ".env"),
        (Join-Path (Split-Path $PSScriptRoot -Parent) ".env")
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return ""
}

$envPath = Resolve-EnvPath
$currentDir = "D:\agrinova\web\current"
$rootServer = Join-Path $currentDir "server.js"
$nestedServer = Join-Path $currentDir "apps\web\server.js"
$rootNextDir = Join-Path $currentDir ".next"
$nestedNextDir = Join-Path $currentDir "apps\web\.next"
$rootBuildId = Join-Path $rootNextDir "BUILD_ID"
$nestedBuildId = Join-Path $nestedNextDir "BUILD_ID"

if ($Environment -eq "production") {
    [Environment]::SetEnvironmentVariable("APP_ENV", "production", "Process")
}

if ([string]::IsNullOrWhiteSpace($envPath)) {
    if ($Environment -eq "production") {
        throw "Production env file is required but not found."
    }

    Write-Host "No .env file found in development mode. Continuing with current process environment."
} else {
    Import-DotEnv -Path $envPath
}

if ([string]::IsNullOrWhiteSpace($env:NODE_ENV)) {
    $defaultNodeEnv = if ($Environment -eq "production") { "production" } else { "development" }
    [Environment]::SetEnvironmentVariable("NODE_ENV", $defaultNodeEnv, "Process")
}

if (Test-Path $rootServer) {
    if (-not (Test-Path $rootBuildId)) {
        throw "Missing Next.js production build at '$rootBuildId'."
    }

    Push-Location $currentDir
    try {
        & node ".\server.js"
        exit $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
}

if (Test-Path $nestedServer) {
    if (-not (Test-Path $nestedBuildId)) {
        if (Test-Path $rootBuildId) {
            Write-Host "Nested .next build not found. Copying from root .next to apps\\web\\.next..."
            Mirror-Directory -Source $rootNextDir -Destination $nestedNextDir
        } else {
            throw "Missing Next.js production build. Checked '$nestedBuildId' and '$rootBuildId'."
        }
    }

    Push-Location (Join-Path $currentDir "apps\web")
    try {
        & node ".\server.js"
        exit $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
}

throw "Missing Next.js server entrypoint. Checked '$rootServer' and '$nestedServer'."
