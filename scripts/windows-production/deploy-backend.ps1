param(
    [Parameter(Mandatory = $true)][string]$RepoOwner,
    [Parameter(Mandatory = $true)][string]$RepoName,
    [string]$ReleaseTag = "latest",
    [string]$DeployRoot = "D:\agrinova",
    [string]$DeployWorkDir = "D:\agrinova\deploy",
    [string]$BackendServiceName = "agrinova-backend",
    [string]$BackendHealthUrl = "http://127.0.0.1:8080/health",
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
            Write-Host "Warning: unable to force TLS 1.2."
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
    if ([string]::IsNullOrWhiteSpace($value)) { $value = [Environment]::GetEnvironmentVariable($Name, "User") }
    if ([string]::IsNullOrWhiteSpace($value)) { $value = [Environment]::GetEnvironmentVariable($Name, "Machine") }
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

    $headers = @{
        Authorization = "Bearer $script:GitHubToken"
        Accept = "application/octet-stream"
        "X-GitHub-Api-Version" = "2022-11-28"
        "User-Agent" = "agrinova-windows-deployer"
    }

    Invoke-WebRequest -Uri $AssetApiUrl -Headers $headers -OutFile $DestinationPath -MaximumRedirection 5
}

function Get-TargetRelease {
    param(
        [Parameter(Mandatory = $true)][string]$Owner,
        [Parameter(Mandatory = $true)][string]$Repo,
        [Parameter(Mandatory = $true)][string]$TagInput
    )

    if ($TagInput -eq "latest") {
        $listUri = "https://api.github.com/repos/$Owner/$Repo/releases?per_page=30"
        $releases = Invoke-GitHubApi -Uri $listUri
        $candidate = $releases |
            Where-Object {
                -not $_.draft -and $_.tag_name -like "backend/v*.*.*"
            } |
            Select-Object -First 1

        if ($null -eq $candidate) {
            throw "No backend release found with tag prefix 'backend/v'."
        }

        return $candidate
    }

    if ($TagInput -notlike "backend/v*") {
        throw "ReleaseTag must use backend tag format: backend/vX.Y.Z"
    }

    $releaseUri = "https://api.github.com/repos/$Owner/$Repo/releases/tags/$TagInput"
    return Invoke-GitHubApi -Uri $releaseUri
}

function Find-BackendArtifactRoot {
    param([Parameter(Mandatory = $true)][string]$ExpandedPath)

    $requiredFiles = @("agrinova-server.exe", "agrinova-migrate.exe")
    $hasAllRequired = $true
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path (Join-Path $ExpandedPath $file))) {
            $hasAllRequired = $false
            break
        }
    }
    if ($hasAllRequired) {
        return $ExpandedPath
    }

    $candidates = Get-ChildItem -Path $ExpandedPath -Recurse -Directory -ErrorAction SilentlyContinue |
        Where-Object {
            (Test-Path (Join-Path $_.FullName "agrinova-server.exe")) -and
            (Test-Path (Join-Path $_.FullName "agrinova-migrate.exe"))
        } |
        Sort-Object { $_.FullName.Length }

    if ($candidates.Count -eq 0) {
        throw "Invalid backend artifact structure. Missing agrinova-server.exe or agrinova-migrate.exe."
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
        ForEach-Object { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }

    Get-ChildItem -Path $TempPath -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-2) } |
        ForEach-Object { Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue }
}

$backendRoot = Join-Path $DeployRoot "backend"
$backendConfigEnv = Join-Path $backendRoot "config\.env"
$backendCurrentPath = Join-Path $backendRoot "current"
$backendReleasesPath = Join-Path $backendRoot "releases"

$statePath = Join-Path $DeployWorkDir "state"
$tempPath = Join-Path $DeployWorkDir "temp"
$logsPath = Join-Path $DeployWorkDir "logs"
$lockPath = Join-Path $statePath "backend-deploy.lock"
$versionPath = Join-Path $statePath "backend-deployed-version.txt"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Ensure-Directory -Path $backendReleasesPath
Ensure-Directory -Path $backendCurrentPath
Ensure-Directory -Path $statePath
Ensure-Directory -Path $tempPath
Ensure-Directory -Path $logsPath

$logFile = Join-Path $logsPath "deploy_backend_$timestamp.log"
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

    $lockStream = [System.IO.File]::Open($lockPath, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)

    if (-not (Test-Path $backendConfigEnv)) {
        throw "Missing backend env file: $backendConfigEnv"
    }

    $script:GitHubToken = Get-MachineEnvironmentValue -Name "AGRINOVA_GH_TOKEN"
    if ([string]::IsNullOrWhiteSpace($script:GitHubToken)) {
        throw "Environment variable 'AGRINOVA_GH_TOKEN' is not set."
    }

    Write-Step "Checking backend release"
    $release = Get-TargetRelease -Owner $RepoOwner -Repo $RepoName -TagInput $ReleaseTag
    $latestTag = $release.tag_name
    $latestVersion = ($latestTag -replace "^backend/v", "") -replace "[^A-Za-z0-9._-]", "_"

    if ([string]::IsNullOrWhiteSpace($latestVersion)) {
        throw "Release tag '$latestTag' produced an empty version string."
    }

    if ($previousVersion -eq $latestVersion) {
        Write-Step "No new backend release. Version '$latestVersion' ($latestTag) is already deployed."
        return
    }

    Write-Step "New backend release detected: $latestTag (current: $(if ($previousVersion) { $previousVersion } else { 'none' }))"

    $asset = $release.assets |
        Where-Object { $_.name -like "agrinova-backend-*.zip" } |
        Select-Object -First 1

    if ($null -eq $asset) {
        throw "No backend ZIP asset found in release '$latestTag'. Expected 'agrinova-backend-*.zip'."
    }

    Write-Step "Found asset '$($asset.name)' ($([math]::Round($asset.size / 1MB, 1)) MB)"

    $downloadZipPath = Join-Path $tempPath ("backend_{0}_{1}.zip" -f ($latestVersion -replace "\.", "_"), $timestamp)
    $extractPath = Join-Path $tempPath ("extract_backend_{0}_{1}" -f ($latestVersion -replace "\.", "_"), $timestamp)
    Ensure-Directory -Path $extractPath

    Write-Step "Downloading backend release asset"
    Download-GitHubReleaseAsset -AssetApiUrl $asset.url -DestinationPath $downloadZipPath

    Write-Step "Extracting backend release"
    Expand-Archive -Path $downloadZipPath -DestinationPath $extractPath -Force
    $backendSource = Find-BackendArtifactRoot -ExpandedPath $extractPath

    $targetVersion = $latestVersion
    $backendTargetRelease = Join-Path $backendReleasesPath $targetVersion

    Write-Step "Preparing backend release '$targetVersion'"
    Mirror-Directory -Source $backendSource -Destination $backendTargetRelease

    Write-Step "Stopping backend service"
    Stop-ServiceIfExists -Name $BackendServiceName

    Write-Step "Updating backend runtime"
    Mirror-Directory -Source $backendTargetRelease -Destination $backendCurrentPath -ExcludeDirectories $backendCurrentExcludedDirs

    Write-Step "Starting backend service"
    Start-ServiceIfExists -Name $BackendServiceName

    Write-Step "Running backend health check"
    $backendHealthy = Test-Health -Url $BackendHealthUrl -TimeoutSeconds $HealthTimeoutSeconds
    if (-not $backendHealthy) {
        throw "Backend health check failed: $BackendHealthUrl"
    }

    Write-FileAscii -Path $versionPath -Value $targetVersion
    Cleanup-OldReleases -ReleasesPath $backendReleasesPath -Keep $KeepReleases

    Write-Step "Backend deployment successful. Version '$targetVersion' ($latestTag) is active."
}
catch {
    Write-Host ""
    Write-Host "Backend deployment failed: $($_.Exception.Message)"

    $rollbackVersion = $previousVersion
    if ([string]::IsNullOrWhiteSpace($rollbackVersion) -or -not (Test-Path (Join-Path $backendReleasesPath $rollbackVersion))) {
        $rollbackVersion = Find-RollbackVersion -ReleasesPath $backendReleasesPath -CurrentVersion $targetVersion
    }

    if (-not [string]::IsNullOrWhiteSpace($rollbackVersion)) {
        $rollbackBackendPath = Join-Path $backendReleasesPath $rollbackVersion
        if (Test-Path $rollbackBackendPath) {
            Write-Step "Attempting backend rollback to '$rollbackVersion'"
            try {
                Stop-ServiceIfExists -Name $BackendServiceName
                Mirror-Directory -Source $rollbackBackendPath -Destination $backendCurrentPath -ExcludeDirectories $backendCurrentExcludedDirs
                Start-ServiceIfExists -Name $BackendServiceName
                Write-FileAscii -Path $versionPath -Value $rollbackVersion
                Write-Step "Backend rollback completed to '$rollbackVersion'"
            }
            catch {
                Write-Host "Backend rollback failed: $($_.Exception.Message)"
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
