[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Tag,

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$CommitMessage = "chore(mobile): sync apps/mobile",

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$Remote = "origin",

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$Path = "apps/mobile",

    [Parameter()]
    [switch]$AllowEmpty
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message"
}

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args,
        [switch]$AllowFailure
    )

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & git -C $script:RepoRoot @Args 2>&1
    $ErrorActionPreference = $previousErrorActionPreference
    $exitCode = $LASTEXITCODE
    if (-not $AllowFailure -and $exitCode -ne 0) {
        $rendered = ($output | ForEach-Object {
            if ($_ -is [System.Management.Automation.ErrorRecord]) {
                $_.ToString()
            } else {
                "$_"
            }
        }) -join [Environment]::NewLine
        throw "git $($Args -join ' ') failed (exit $exitCode).`n$rendered"
    }

    return ($output | ForEach-Object {
        if ($_ -is [System.Management.Automation.ErrorRecord]) {
            $_.ToString().TrimEnd()
        } else {
            "$_".TrimEnd()
        }
    })
}

$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
    throw "Repository root not found at '$RepoRoot'."
}

$targetPath = Join-Path $RepoRoot $Path
if (-not (Test-Path $targetPath)) {
    throw "Target path not found: '$targetPath'."
}

$null = Invoke-Git -Args @("remote", "get-url", $Remote)
$branch = (Invoke-Git -Args @("rev-parse", "--abbrev-ref", "HEAD")) -join ""
$branch = $branch.Trim()
if ([string]::IsNullOrWhiteSpace($branch) -or $branch -eq "HEAD") {
    throw "Detached HEAD is not supported. Checkout a branch first."
}

$existingLocalTag = (Invoke-Git -Args @("tag", "-l", $Tag)) -join ""
if (-not [string]::IsNullOrWhiteSpace($existingLocalTag)) {
    throw "Tag '$Tag' already exists locally."
}

$existingRemoteTag = (Invoke-Git -Args @("ls-remote", "--tags", $Remote, "refs/tags/$Tag")) -join ""
if (-not [string]::IsNullOrWhiteSpace($existingRemoteTag)) {
    throw "Tag '$Tag' already exists on remote '$Remote'."
}

$pathStatus = Invoke-Git -Args @("status", "--porcelain", "--", $Path)
if ($pathStatus.Count -eq 0 -and -not $AllowEmpty) {
    throw "No changes detected in '$Path'. Use -AllowEmpty to force an empty commit."
}

if ($pathStatus.Count -gt 0) {
    if ($PSCmdlet.ShouldProcess($Path, "Stage changes")) {
        Write-Step "Staging $Path"
        $null = Invoke-Git -Args @("add", "--", $Path)
    }
}

$stagedInPath = Invoke-Git -Args @("diff", "--cached", "--name-only", "--", $Path)
if ($stagedInPath.Count -eq 0 -and -not $AllowEmpty) {
    throw "No staged changes found in '$Path'. Use -AllowEmpty to force an empty commit."
}

if ($stagedInPath.Count -gt 0) {
    if ($PSCmdlet.ShouldProcess($branch, "Create commit for $Path")) {
        Write-Step "Creating commit"
        $null = Invoke-Git -Args @("commit", "-m", $CommitMessage, "--", $Path)
    }
} elseif ($AllowEmpty) {
    if ($PSCmdlet.ShouldProcess($branch, "Create empty commit")) {
        Write-Step "Creating empty commit"
        $null = Invoke-Git -Args @("commit", "--allow-empty", "-m", $CommitMessage)
    }
}

if ($PSCmdlet.ShouldProcess("$Remote/$branch", "Push branch")) {
    Write-Step "Pushing branch '$branch' to '$Remote'"
    $null = Invoke-Git -Args @("push", $Remote, $branch)
}

if ($PSCmdlet.ShouldProcess("tag/$Tag", "Create annotated tag")) {
    Write-Step "Creating tag '$Tag'"
    $null = Invoke-Git -Args @("tag", "-a", $Tag, "-m", $Tag)
}

if ($PSCmdlet.ShouldProcess("$Remote tag/$Tag", "Push tag")) {
    Write-Step "Pushing tag '$Tag' to '$Remote'"
    $null = Invoke-Git -Args @("push", $Remote, $Tag)
}

Write-Host ""
Write-Host "Done."
Write-Host "  Branch: $branch"
Write-Host "  Remote: $Remote"
Write-Host "  Path:   $Path"
Write-Host "  Tag:    $Tag"
