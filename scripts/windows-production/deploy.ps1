param(
    [Parameter(Mandatory = $true)][string]$RepoOwner,
    [Parameter(Mandatory = $true)][string]$RepoName,
    [string]$ReleaseTag = "latest",
    [string]$DeployRoot = "D:\agrinova",
    [string]$DeployWorkDir = "D:\agrinova\deploy",
    [string]$BackendServiceName = "agrinova-backend",
    [string]$WebServiceName = "agrinova-web",
    [string]$BackendHealthUrl = "http://127.0.0.1:8080/health",
    [string]$WebHealthUrl = "http://127.0.0.1:3000",
    [int]$HealthTimeoutSeconds = 90,
    [int]$KeepReleases = 5
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message"
}

function Enable-Tls12ForLegacyPowerShell {
    if ($PSVersionTable.PSVersion.Major -lt 6) {
        try {
            $tls12 = [System.Net.SecurityProtocolType]::Tls12
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor $tls12
        }
        catch {
            Write-Host "Warning: Unable to force TLS 1.2. HTTPS calls may fail."
        }
    }
}

function Ensure-Directory {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -Path $Path -ItemType Directory -Force | Out-Null
    }
}

function Get-MachineEnvironmentValue {
    param([Parameter(Mandatory = $true)][string]$Name)

    $value = [Environment]::GetEnvironmentVariable($Name, "Process")
    if ([string]::IsNullOrWhiteSpace($value)) {
        $value = [Environment]::GetEnvironmentVariable($Name, "User")
    }
    if ([string]::IsNullOrWhiteSpace($value)) {
        $value = [Environment]::GetEnvironmentVariable($Name, "Machine")
    }

    return $value
}

function Invoke-GitHubApi {
    param([Parameter(Mandatory = $true)][string]$Uri)

    $headers = @{
        Authorization = "Bearer $script:GitHubToken"
        Accept = "application/vnd.github+json"
        "X-GitHub-Api-Version" = "2022-11-28"
        "User-Agent" = "agrinova-windows-deployer"
    }

    return Invoke-RestMethod -Method Get -Uri $Uri -Headers $headers
}

function Download-GitHubReleaseAsset {
    param(
        [Parameter(Mandatory = $true)][string]$AssetApiUrl,
        [Parameter(Mandatory = $true)][string]$DestinationPath
    )

    # Release asset download requires Accept: application/octet-stream to get the binary.
    # GitHub redirects to the actual CDN URL; MaximumRedirection handles it.
    $headers = @{
        Authorization = "Bearer $script:GitHubToken"
        Accept = "application/octet-stream"
        "X-GitHub-Api-Version" = "2022-11-28"
        "User-Agent" = "agrinova-windows-deployer"
    }

    Invoke-WebRequest -Uri $AssetApiUrl -Headers $headers -OutFile $DestinationPath -MaximumRedirection 5
}

function Find-BundleRoot {
    param([Parameter(Mandatory = $true)][string]$ExpandedPath)

    if ((Test-Path (Join-Path $ExpandedPath "backend")) -and (Test-Path (Join-Path $ExpandedPath "web"))) {
        return $ExpandedPath
    }

    $candidates = Get-ChildItem -Path $ExpandedPath -Recurse -Directory -ErrorAction SilentlyContinue |
        Where-Object {
            (Test-Path (Join-Path $_.FullName "backend")) -and (Test-Path (Join-Path $_.FullName "web"))
        } |
        Sort-Object { $_.FullName.Length }

    if ($candidates.Count -eq 0) {
        throw "Invalid artifact structure. Expected backend/ and web/ directories."
    }

    return $candidates[0].FullName
}

function Mirror-Directory {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination,
        [string[]]$ExcludeDirectories = @()
    )

    if (-not (Test-Path $Source)) {
        throw "Source directory does not exist: $Source"
    }

    Ensure-Directory -Path $Destination

    $robocopyArgs = @(
        $Source,
        $Destination,
        "/MIR",
        "/NFL",
        "/NDL",
        "/NJH",
        "/NJS",
        "/NP",
        "/R:2",
        "/W:1"
    )

    if ($ExcludeDirectories -and $ExcludeDirectories.Count -gt 0) {
        $robocopyArgs += "/XD"
        $robocopyArgs += $ExcludeDirectories
    }

    robocopy @robocopyArgs | Out-Null
    $code = $LASTEXITCODE
    if ($code -ge 8) {
        throw "robocopy failed from '$Source' to '$Destination' (exit code $code)"
    }
}

function Stop-ServiceIfExists {
    param([Parameter(Mandatory = $true)][string]$Name)

    $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if ($null -eq $svc) {
        Write-Step "Service '$Name' not found. Stop skipped."
        return
    }

    if ($svc.Status -ne "Stopped") {
        Write-Step "Stopping service '$Name'"
        Stop-Service -Name $Name -Force -ErrorAction Stop
        (Get-Service -Name $Name).WaitForStatus("Stopped", (New-TimeSpan -Seconds 30))
    }
}

function Start-ServiceIfExists {
    param([Parameter(Mandatory = $true)][string]$Name)

    $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if ($null -eq $svc) {
        Write-Step "Service '$Name' not found. Start skipped."
        return
    }

    Write-Step "Starting service '$Name'"
    Start-Service -Name $Name -ErrorAction Stop
    (Get-Service -Name $Name).WaitForStatus("Running", (New-TimeSpan -Seconds 30))
}

function Test-Health {
    param(
        [string]$Url,
        [int]$TimeoutSeconds
    )

    if ([string]::IsNullOrWhiteSpace($Url)) {
        return $true
    }

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                return $true
            }
        }
        catch {
            Start-Sleep -Seconds 3
        }
    } while ((Get-Date) -lt $deadline)

    return $false
}

function Read-FileTrimmed {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path $Path)) {
        return $null
    }
    return (Get-Content -Path $Path -Raw).Trim()
}

function Write-FileAscii {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Value
    )
    Set-Content -Path $Path -Value $Value -Encoding ASCII
}

function Cleanup-OldReleases {
    param(
        [Parameter(Mandatory = $true)][string]$ReleasesPath,
        [int]$Keep
    )

    if ($Keep -lt 1 -or -not (Test-Path $ReleasesPath)) {
        return
    }

    $all = Get-ChildItem -Path $ReleasesPath -Directory | Sort-Object LastWriteTime -Descending
    $deleteList = $all | Select-Object -Skip $Keep
    foreach ($item in $deleteList) {
        Remove-Item -Path $item.FullName -Recurse -Force
    }
}

function Find-RollbackVersion {
    param(
        [Parameter(Mandatory = $true)][string]$ReleasesPath,
        [AllowEmptyString()][string]$CurrentVersion = ""
    )

    if (-not (Test-Path $ReleasesPath)) {
        return $null
    }

    $candidates = Get-ChildItem -Path $ReleasesPath -Directory | Sort-Object LastWriteTime -Descending
    if (-not [string]::IsNullOrWhiteSpace($CurrentVersion)) {
        $candidates = $candidates | Where-Object { $_.Name -ne $CurrentVersion }
    }
    $candidate = $candidates | Select-Object -First 1

    if ($null -eq $candidate) {
        return $null
    }

    return $candidate.Name
}

function Cleanup-TempPath {
    param([Parameter(Mandatory = $true)][string]$TempPath)

    if (-not (Test-Path $TempPath)) {
        return
    }

    Get-ChildItem -Path $TempPath -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-2) } |
        ForEach-Object {
            Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
        }

    Get-ChildItem -Path $TempPath -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-2) } |
        ForEach-Object {
            Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
        }
}

$backendRoot = Join-Path $DeployRoot "backend"
$webRoot = Join-Path $DeployRoot "web"
$backendConfigEnv = Join-Path $backendRoot "config\.env"
$webConfigEnv = Join-Path $webRoot "config\.env"
$backendCurrentPath = Join-Path $backendRoot "current"
$webCurrentPath = Join-Path $webRoot "current"
$backendReleasesPath = Join-Path $backendRoot "releases"
$webReleasesPath = Join-Path $webRoot "releases"

$statePath = Join-Path $DeployWorkDir "state"
$tempPath = Join-Path $DeployWorkDir "temp"
$logsPath = Join-Path $DeployWorkDir "logs"
$lockPath = Join-Path $statePath "deploy.lock"
$versionPath = Join-Path $statePath "deployed-version.txt"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Ensure-Directory -Path $backendReleasesPath
Ensure-Directory -Path $webReleasesPath
Ensure-Directory -Path $backendCurrentPath
Ensure-Directory -Path $webCurrentPath
Ensure-Directory -Path $statePath
Ensure-Directory -Path $tempPath
Ensure-Directory -Path $logsPath

$logFile = Join-Path $logsPath "deploy_$timestamp.log"
$backendCurrentExcludedDirs = @("uploads")
$lockStream = $null
$downloadZipPath = $null
$extractPath = $null
$targetVersion = $null
$previousVersion = Read-FileTrimmed -Path $versionPath

try {
    Start-Transcript -Path $logFile -Append | Out-Null
}
catch {
    Write-Host "Unable to start transcript logging. Continuing without transcript."
}

try {
    Enable-Tls12ForLegacyPowerShell

    # Use a lock file to prevent concurrent scheduled runs.
    $lockStream = [System.IO.File]::Open($lockPath, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)

    if (-not (Test-Path $backendConfigEnv)) {
        throw "Missing backend env file: $backendConfigEnv"
    }

    if (-not (Test-Path $webConfigEnv)) {
        throw "Missing web env file: $webConfigEnv"
    }

    $script:GitHubToken = Get-MachineEnvironmentValue -Name "AGRINOVA_GH_TOKEN"
    if ([string]::IsNullOrWhiteSpace($script:GitHubToken)) {
        throw "Environment variable 'AGRINOVA_GH_TOKEN' is not set."
    }

    # ── Fetch GitHub Release ──────────────────────────────────────────────────
    if ($ReleaseTag -eq "latest") {
        Write-Step "Checking latest GitHub Release"
        $releaseUri = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"
    }
    else {
        Write-Step "Checking GitHub Release tag '$ReleaseTag'"
        $releaseUri = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/tags/$ReleaseTag"
    }

    $release = Invoke-GitHubApi -Uri $releaseUri
    $latestTag = $release.tag_name   # e.g. "v1.2.3"

    # Derive folder-safe version: strip leading "v", sanitize characters.
    $latestVersion = ($latestTag -replace "^v", "") -replace "[^A-Za-z0-9._-]", "_"

    if ([string]::IsNullOrWhiteSpace($latestVersion)) {
        throw "Release tag '$latestTag' produced an empty version string."
    }

    # ── Skip if already deployed ──────────────────────────────────────────────
    if ($previousVersion -eq $latestVersion) {
        Write-Step "No new release. Version '$latestVersion' ($latestTag) is already deployed."
        return
    }

    Write-Step "New release detected: $latestTag (currently deployed: $(if ($previousVersion) { $previousVersion } else { 'none' }))"

    # ── Find release asset ZIP ────────────────────────────────────────────────
    $asset = $release.assets |
        Where-Object { $_.name -like "agrinova-production-*.zip" } |
        Select-Object -First 1

    if ($null -eq $asset) {
        throw "No ZIP asset found in release '$latestTag'. Expected a file matching 'agrinova-production-*.zip'."
    }

    Write-Step "Found asset '$($asset.name)' ($([math]::Round($asset.size / 1MB, 1)) MB)"

    # ── Download ──────────────────────────────────────────────────────────────
    $downloadZipPath = Join-Path $tempPath ("release_{0}_{1}.zip" -f ($latestVersion -replace "\.", "_"), $timestamp)
    $extractPath = Join-Path $tempPath ("extract_{0}_{1}" -f ($latestVersion -replace "\.", "_"), $timestamp)
    Ensure-Directory -Path $extractPath

    Write-Step "Downloading release asset"
    Download-GitHubReleaseAsset -AssetApiUrl $asset.url -DestinationPath $downloadZipPath

    # ── Extract & validate ────────────────────────────────────────────────────
    Write-Step "Extracting release"
    Expand-Archive -Path $downloadZipPath -DestinationPath $extractPath -Force
    $bundleRoot = Find-BundleRoot -ExpandedPath $extractPath

    $backendSource = Join-Path $bundleRoot "backend"
    $webSource = Join-Path $bundleRoot "web"

    if (-not (Test-Path (Join-Path $backendSource "agrinova-migrate.exe"))) {
        throw "Invalid backend artifact: missing agrinova-migrate.exe"
    }
    if (-not (Test-Path (Join-Path $backendSource "agrinova-server.exe"))) {
        throw "Invalid backend artifact: missing agrinova-server.exe"
    }
    if (
        -not (Test-Path (Join-Path $webSource "server.js")) -and
        -not (Test-Path (Join-Path $webSource "apps\web\server.js"))
    ) {
        throw "Invalid web artifact: missing server.js"
    }

    $webBuildIdCandidates = @(
        (Join-Path $webSource ".next\BUILD_ID"),
        (Join-Path $webSource "apps\web\.next\BUILD_ID")
    )
    $webBuildIdExists = $false
    foreach ($candidate in $webBuildIdCandidates) {
        if (Test-Path $candidate) {
            $webBuildIdExists = $true
            break
        }
    }
    if (-not $webBuildIdExists) {
        throw "Invalid web artifact: missing .next/BUILD_ID."
    }

    $targetVersion = $latestVersion

    # ── Prepare release folders ───────────────────────────────────────────────
    $backendTargetRelease = Join-Path $backendReleasesPath $targetVersion
    $webTargetRelease = Join-Path $webReleasesPath $targetVersion

    Write-Step "Preparing release '$targetVersion'"
    Mirror-Directory -Source $backendSource -Destination $backendTargetRelease
    Mirror-Directory -Source $webSource -Destination $webTargetRelease

    # ── Deploy ────────────────────────────────────────────────────────────────
    Write-Step "Stopping services"
    Stop-ServiceIfExists -Name $WebServiceName
    Stop-ServiceIfExists -Name $BackendServiceName

    Write-Step "Updating current runtime"
    Mirror-Directory -Source $backendTargetRelease -Destination $backendCurrentPath -ExcludeDirectories $backendCurrentExcludedDirs
    Mirror-Directory -Source $webTargetRelease -Destination $webCurrentPath

    Write-Step "Starting services"
    Start-ServiceIfExists -Name $BackendServiceName
    Start-ServiceIfExists -Name $WebServiceName

    # ── Health check ──────────────────────────────────────────────────────────
    Write-Step "Running health checks"
    $backendHealthy = Test-Health -Url $BackendHealthUrl -TimeoutSeconds $HealthTimeoutSeconds
    if (-not $backendHealthy) {
        throw "Backend health check failed: $BackendHealthUrl"
    }

    $webHealthy = Test-Health -Url $WebHealthUrl -TimeoutSeconds $HealthTimeoutSeconds
    if (-not $webHealthy) {
        throw "Web health check failed: $WebHealthUrl"
    }

    # ── Save state ────────────────────────────────────────────────────────────
    Write-FileAscii -Path $versionPath -Value $targetVersion

    Cleanup-OldReleases -ReleasesPath $backendReleasesPath -Keep $KeepReleases
    Cleanup-OldReleases -ReleasesPath $webReleasesPath -Keep $KeepReleases

    Write-Step "Deployment successful. Version '$targetVersion' ($latestTag) is active."
}
catch {
    Write-Host ""
    Write-Host "Deployment failed: $($_.Exception.Message)"

    $rollbackVersion = $previousVersion
    if ([string]::IsNullOrWhiteSpace($rollbackVersion) -or -not (Test-Path (Join-Path $backendReleasesPath $rollbackVersion))) {
        $rollbackVersion = Find-RollbackVersion -ReleasesPath $backendReleasesPath -CurrentVersion $targetVersion
    }

    if (-not [string]::IsNullOrWhiteSpace($rollbackVersion)) {
        $rollbackBackendPath = Join-Path $backendReleasesPath $rollbackVersion
        $rollbackWebPath = Join-Path $webReleasesPath $rollbackVersion

        if ((Test-Path $rollbackBackendPath) -and (Test-Path $rollbackWebPath)) {
            Write-Step "Attempting rollback to '$rollbackVersion'"
            try {
                Stop-ServiceIfExists -Name $WebServiceName
                Stop-ServiceIfExists -Name $BackendServiceName

                Mirror-Directory -Source $rollbackBackendPath -Destination $backendCurrentPath -ExcludeDirectories $backendCurrentExcludedDirs
                Mirror-Directory -Source $rollbackWebPath -Destination $webCurrentPath

                Start-ServiceIfExists -Name $BackendServiceName
                Start-ServiceIfExists -Name $WebServiceName

                Write-FileAscii -Path $versionPath -Value $rollbackVersion
                Write-Step "Rollback completed to '$rollbackVersion'"
            }
            catch {
                Write-Host "Rollback failed: $($_.Exception.Message)"
            }
        }
    }

    throw
}
finally {
    Cleanup-TempPath -TempPath $tempPath

    if ($lockStream -ne $null) {
        $lockStream.Close()
        $lockStream.Dispose()
    }

    try {
        Stop-Transcript | Out-Null
    }
    catch {
        # no-op
    }
}
