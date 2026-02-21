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

function Resolve-EnvPath {
    if (-not [string]::IsNullOrWhiteSpace($EnvFile)) {
        return $EnvFile
    }

    if ($Environment -eq "production") {
        return "D:\agrinova\backend\config\.env"
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
$currentDir = "D:\agrinova\backend\current"
$migrateExe = Join-Path $currentDir "agrinova-migrate.exe"
$serverExe = Join-Path $currentDir "agrinova-server.exe"

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

if (-not (Test-Path $migrateExe)) {
    throw "Missing file: $migrateExe"
}

if (-not (Test-Path $serverExe)) {
    throw "Missing file: $serverExe"
}

Push-Location $currentDir
try {
    Write-Host "Running database migration..."
    & $migrateExe
    if ($LASTEXITCODE -ne 0) {
        throw "Migration failed with exit code $LASTEXITCODE"
    }

    Write-Host "Migration succeeded. Starting backend server..."
    & $serverExe
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
