param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$Levels = "25,50,75,100",
    [switch]$DebugUsers
)

$targets = $Levels.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }

if ($targets.Count -eq 0) {
    throw "Levels must contain at least one concurrency target."
}

foreach ($target in $targets) {
    Write-Host ""
    Write-Host ("=== Mobile Login Capacity Sweep: {0} VUs ===" -f $target) -ForegroundColor Cyan

    $arguments = @(
        "run",
        "--address", "localhost:0",
        "--stage", ("30s:{0}" -f $target),
        "--stage", ("1m:{0}" -f $target),
        "--stage", "15s:0",
        "-e", ("BASE_URL={0}" -f $BaseUrl),
        "-e", "MOBILE_VERIFY_TOKEN=false"
    )

    if ($DebugUsers) {
        $arguments += @("-e", "MOBILE_DEBUG_USERS=true")
    }

    $arguments += ".\tests\k6\login-mobile.js"

    & k6 @arguments
    if ($LASTEXITCODE -ne 0) {
        Write-Warning ("Mobile capacity sweep run at {0} VUs exited with code {1}" -f $target, $LASTEXITCODE)
    }
}
