param(
    [Parameter(Mandatory = $true)][string]$RepoOwner,
    [Parameter(Mandatory = $true)][string]$RepoName,
    [string]$ReleaseTag = "latest",
    [string]$DeployRoot = "D:\agrinova",
    [string]$DeployWorkDir = "D:\agrinova\deploy",
    [string]$WebServiceName = "agrinova-web",
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
                -not $_.draft -and $_.tag_name -like "web/v*.*.*"
            } |
            Select-Object -First 1

        if ($null -eq $candidate) {
            throw "No web release found with tag prefix 'web/v'."
        }

        return $candidate
    }

    if ($TagInput -notlike "web/v*") {
        throw "ReleaseTag must use web tag format: web/vX.Y.Z"
    }

    $releaseUri = "https://api.github.com/repos/$Owner/$Repo/releases/tags/$TagInput"
    return Invoke-GitHubApi -Uri $releaseUri
}

function Find-WebArtifactRoot {
    param([Parameter(Mandatory = $true)][string]$ExpandedPath)

    $rootServer = Join-Path $ExpandedPath "server.js"
    $nestedServer = Join-Path $ExpandedPath "apps\web\server.js"
    $rootBuild = Join-Path $ExpandedPath ".next\BUILD_ID"
    $nestedBuild = Join-Path $ExpandedPath "apps\web\.next\BUILD_ID"

    if (((Test-Path $rootServer) -or (Test-Path $nestedServer)) -and ((Test-Path $rootBuild) -or (Test-Path $nestedBuild))) {
        return $ExpandedPath
    }

    $candidates = Get-ChildItem -Path $ExpandedPath -Recurse -Directory -ErrorAction SilentlyContinue |
        Where-Object {
            (
                (Test-Path (Join-Path $_.FullName "server.js")) -or
                (Test-Path (Join-Path $_.FullName "apps\web\server.js"))
            ) -and (
                (Test-Path (Join-Path $_.FullName ".next\BUILD_ID")) -or
                (Test-Path (Join-Path $_.FullName "apps\web\.next\BUILD_ID"))
            )
        } |
        Sort-Object { $_.FullName.Length }

    if ($candidates.Count -eq 0) {
        throw "Invalid web artifact structure. Missing server.js or .next/BUILD_ID."
    }

    return $candidates[0].FullName
}

function Mirror-Directory {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination
    )

    if (-not (Test-Path $Source)) {
        throw "Source directory does not exist: $Source"
    }

    Ensure-Directory -Path $Destination
    robocopy $Source $Destination /MIR /NFL /NDL /NJH /NJS /NP /R:2 /W:1 | Out-Null
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

$webRoot = Join-Path $DeployRoot "web"
$webConfigEnv = Join-Path $webRoot "config\.env"
$webCurrentPath = Join-Path $webRoot "current"
$webReleasesPath = Join-Path $webRoot "releases"

$statePath = Join-Path $DeployWorkDir "state"
$tempPath = Join-Path $DeployWorkDir "temp"
$logsPath = Join-Path $DeployWorkDir "logs"
$lockPath = Join-Path $statePath "web-deploy.lock"
$versionPath = Join-Path $statePath "web-deployed-version.txt"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Ensure-Directory -Path $webReleasesPath
Ensure-Directory -Path $webCurrentPath
Ensure-Directory -Path $statePath
Ensure-Directory -Path $tempPath
Ensure-Directory -Path $logsPath

$logFile = Join-Path $logsPath "deploy_web_$timestamp.log"
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

    if (-not (Test-Path $webConfigEnv)) {
        throw "Missing web env file: $webConfigEnv"
    }

    $script:GitHubToken = Get-MachineEnvironmentValue -Name "AGRINOVA_GH_TOKEN"
    if ([string]::IsNullOrWhiteSpace($script:GitHubToken)) {
        throw "Environment variable 'AGRINOVA_GH_TOKEN' is not set."
    }

    Write-Step "Checking web release"
    $release = Get-TargetRelease -Owner $RepoOwner -Repo $RepoName -TagInput $ReleaseTag
    $latestTag = $release.tag_name
    $latestVersion = ($latestTag -replace "^web/v", "") -replace "[^A-Za-z0-9._-]", "_"

    if ([string]::IsNullOrWhiteSpace($latestVersion)) {
        throw "Release tag '$latestTag' produced an empty version string."
    }

    if ($previousVersion -eq $latestVersion) {
        Write-Step "No new web release. Version '$latestVersion' ($latestTag) is already deployed."
        return
    }

    Write-Step "New web release detected: $latestTag (current: $(if ($previousVersion) { $previousVersion } else { 'none' }))"

    $asset = $release.assets |
        Where-Object { $_.name -like "agrinova-web-standalone-*.zip" } |
        Select-Object -First 1

    if ($null -eq $asset) {
        throw "No web ZIP asset found in release '$latestTag'. Expected 'agrinova-web-standalone-*.zip'."
    }

    Write-Step "Found asset '$($asset.name)' ($([math]::Round($asset.size / 1MB, 1)) MB)"

    $downloadZipPath = Join-Path $tempPath ("web_{0}_{1}.zip" -f ($latestVersion -replace "\.", "_"), $timestamp)
    $extractPath = Join-Path $tempPath ("extract_web_{0}_{1}" -f ($latestVersion -replace "\.", "_"), $timestamp)
    Ensure-Directory -Path $extractPath

    Write-Step "Downloading web release asset"
    Download-GitHubReleaseAsset -AssetApiUrl $asset.url -DestinationPath $downloadZipPath

    Write-Step "Extracting web release"
    Expand-Archive -Path $downloadZipPath -DestinationPath $extractPath -Force
    $webSource = Find-WebArtifactRoot -ExpandedPath $extractPath

    $targetVersion = $latestVersion
    $webTargetRelease = Join-Path $webReleasesPath $targetVersion

    Write-Step "Preparing web release '$targetVersion'"
    Mirror-Directory -Source $webSource -Destination $webTargetRelease

    Write-Step "Stopping web service"
    Stop-ServiceIfExists -Name $WebServiceName

    Write-Step "Updating web runtime"
    Mirror-Directory -Source $webTargetRelease -Destination $webCurrentPath

    Write-Step "Starting web service"
    Start-ServiceIfExists -Name $WebServiceName

    Write-Step "Running web health check"
    $webHealthy = Test-Health -Url $WebHealthUrl -TimeoutSeconds $HealthTimeoutSeconds
    if (-not $webHealthy) {
        throw "Web health check failed: $WebHealthUrl"
    }

    Write-FileAscii -Path $versionPath -Value $targetVersion
    Cleanup-OldReleases -ReleasesPath $webReleasesPath -Keep $KeepReleases

    Write-Step "Web deployment successful. Version '$targetVersion' ($latestTag) is active."
}
catch {
    Write-Host ""
    Write-Host "Web deployment failed: $($_.Exception.Message)"

    $rollbackVersion = $previousVersion
    if ([string]::IsNullOrWhiteSpace($rollbackVersion) -or -not (Test-Path (Join-Path $webReleasesPath $rollbackVersion))) {
        $rollbackVersion = Find-RollbackVersion -ReleasesPath $webReleasesPath -CurrentVersion $targetVersion
    }

    if (-not [string]::IsNullOrWhiteSpace($rollbackVersion)) {
        $rollbackWebPath = Join-Path $webReleasesPath $rollbackVersion
        if (Test-Path $rollbackWebPath) {
            Write-Step "Attempting web rollback to '$rollbackVersion'"
            try {
                Stop-ServiceIfExists -Name $WebServiceName
                Mirror-Directory -Source $rollbackWebPath -Destination $webCurrentPath
                Start-ServiceIfExists -Name $WebServiceName
                Write-FileAscii -Path $versionPath -Value $rollbackVersion
                Write-Step "Web rollback completed to '$rollbackVersion'"
            }
            catch {
                Write-Host "Web rollback failed: $($_.Exception.Message)"
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
