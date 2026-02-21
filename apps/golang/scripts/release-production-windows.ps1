param(
    [ValidateSet("amd64", "arm64")]
    [string]$TargetArch = "amd64",

    [string]$ReleaseName = ""
)

$ErrorActionPreference = "Stop"

$runtimeScript = Join-Path $PSScriptRoot "release-production-runtime.ps1"
if (-not (Test-Path $runtimeScript)) {
    throw "Required script not found: '$runtimeScript'"
}

& $runtimeScript -TargetOS windows -TargetArch $TargetArch -ReleaseName $ReleaseName

if (-not $?) {
    throw "Windows backend release packaging failed."
}
