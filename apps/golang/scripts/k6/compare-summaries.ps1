param(
    [Parameter(Mandatory = $true)]
    [string]$Baseline,

    [Parameter(Mandatory = $true)]
    [string]$Candidate,

    [switch]$AsJson
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-SummaryFile {
    param(
        [string]$Path
    )

    $resolved = Resolve-Path -LiteralPath $Path
    $content = Get-Content -LiteralPath $resolved -Raw | ConvertFrom-Json

    if ($null -ne $content.compact) {
        return @{
            Path = $resolved.Path
            Data = $content.compact
        }
    }

    return @{
        Path = $resolved.Path
        Data = $content
    }
}

function Get-NumericValue {
    param(
        [object]$Object,
        [string[]]$Segments
    )

    $current = $Object

    foreach ($segment in $Segments) {
        if ($null -eq $current) {
            return $null
        }

        $current = $current.$segment
    }

    if ($null -eq $current) {
        return $null
    }

    return [double]$current
}

function Format-Number {
    param(
        [object]$Value
    )

    if ($null -eq $Value) {
        return 'n/a'
    }

    return ('{0:N4}' -f ([double]$Value))
}

function Format-Percent {
    param(
        [object]$Value
    )

    if ($null -eq $Value) {
        return 'n/a'
    }

    return ('{0:N2}%' -f (([double]$Value) * 100))
}

function Build-Comparison {
    param(
        [object]$BaselineData,
        [object]$CandidateData
    )

    $metrics = @(
        @{ Name = 'iterations'; Path = @('iterations'); Format = 'number'; LowerIsBetter = $false },
        @{ Name = 'httpRequests'; Path = @('httpRequests'); Format = 'number'; LowerIsBetter = $false },
        @{ Name = 'checksPassRate'; Path = @('checksPassRate'); Format = 'percent'; LowerIsBetter = $false },
        @{ Name = 'httpFailureRate'; Path = @('httpFailureRate'); Format = 'percent'; LowerIsBetter = $true },
        @{ Name = 'loginP95Ms'; Path = @('durations', 'loginP95Ms'); Format = 'number'; LowerIsBetter = $true },
        @{ Name = 'recordSyncP95Ms'; Path = @('durations', 'recordSyncP95Ms'); Format = 'number'; LowerIsBetter = $true },
        @{ Name = 'photoSyncP95Ms'; Path = @('durations', 'photoSyncP95Ms'); Format = 'number'; LowerIsBetter = $true },
        @{ Name = 'employeeSyncP95Ms'; Path = @('durations', 'employeeSyncP95Ms'); Format = 'number'; LowerIsBetter = $true },
        @{ Name = 'serverUpdatesP95Ms'; Path = @('durations', 'serverUpdatesP95Ms'); Format = 'number'; LowerIsBetter = $true },
        @{ Name = 'httpReqDurationP95Ms'; Path = @('durations', 'httpReqDurationP95Ms'); Format = 'number'; LowerIsBetter = $true }
    )

    $rows = foreach ($metric in $metrics) {
        $baselineValue = Get-NumericValue -Object $BaselineData -Segments $metric.Path
        $candidateValue = Get-NumericValue -Object $CandidateData -Segments $metric.Path
        $delta = $null
        $changeRatio = $null
        $status = 'unchanged'

        if ($null -ne $baselineValue -and $null -ne $candidateValue) {
            $delta = $candidateValue - $baselineValue

            if ($baselineValue -ne 0) {
                $changeRatio = $delta / $baselineValue
            }

            if ($delta -ne 0) {
                if ($metric.LowerIsBetter) {
                    $status = if ($delta -lt 0) { 'improved' } else { 'regressed' }
                }
                else {
                    $status = if ($delta -gt 0) { 'improved' } else { 'regressed' }
                }
            }
        }

        [pscustomobject]@{
            Metric = $metric.Name
            Baseline = $baselineValue
            Candidate = $candidateValue
            Delta = $delta
            ChangeRatio = $changeRatio
            Status = $status
            Format = $metric.Format
        }
    }

    return $rows
}

$baselineSummary = Read-SummaryFile -Path $Baseline
$candidateSummary = Read-SummaryFile -Path $Candidate
$comparisons = Build-Comparison -BaselineData $baselineSummary.Data -CandidateData $candidateSummary.Data

if ($AsJson) {
    [pscustomobject]@{
        baseline = $baselineSummary.Path
        candidate = $candidateSummary.Path
        comparisons = $comparisons
    } | ConvertTo-Json -Depth 6
    exit 0
}

Write-Host 'k6 Summary Comparison'
Write-Host ('baseline  : {0}' -f $baselineSummary.Path)
Write-Host ('candidate : {0}' -f $candidateSummary.Path)
Write-Host ''

$table = foreach ($row in $comparisons) {
    $baselineText = if ($row.Format -eq 'percent') {
        Format-Percent $row.Baseline
    }
    else {
        Format-Number $row.Baseline
    }

    $candidateText = if ($row.Format -eq 'percent') {
        Format-Percent $row.Candidate
    }
    else {
        Format-Number $row.Candidate
    }

    $deltaText = if ($row.Format -eq 'percent') {
        Format-Percent $row.Delta
    }
    else {
        Format-Number $row.Delta
    }

    $changeText = if ($null -eq $row.ChangeRatio) {
        'n/a'
    }
    else {
        '{0:N2}%' -f ($row.ChangeRatio * 100)
    }

    [pscustomobject]@{
        Metric = $row.Metric
        Baseline = $baselineText
        Candidate = $candidateText
        Delta = $deltaText
        Change = $changeText
        Status = $row.Status
    }
}

$table | Format-Table -AutoSize
