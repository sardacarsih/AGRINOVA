# ================================================================
# Apply RLS Context Functions Fix
# ================================================================
# This PowerShell script applies the RLS context functions to your
# PostgreSQL database to fix the missing app_set_user_context error
# ================================================================

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Agrinova RLS Functions Fix" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env file if it exists
$envFile = ".env"
if (Test-Path $envFile) {
    Write-Host "Loading database configuration from .env..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
} else {
    Write-Host "No .env file found. Please ensure environment variables are set." -ForegroundColor Yellow
}

# Get database configuration from environment variables
$DB_HOST = $env:DATABASE_HOST
$DB_PORT = $env:DATABASE_PORT
$DB_USER = $env:DATABASE_USER
$DB_PASSWORD = $env:DATABASE_PASSWORD
$DB_NAME = $env:DATABASE_NAME

# Validate configuration
if (-not $DB_HOST -or -not $DB_USER -or -not $DB_NAME) {
    Write-Host "ERROR: Missing database configuration!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set the following environment variables:" -ForegroundColor Yellow
    Write-Host "  DATABASE_HOST     (current: $DB_HOST)" -ForegroundColor Gray
    Write-Host "  DATABASE_PORT     (current: $DB_PORT)" -ForegroundColor Gray
    Write-Host "  DATABASE_USER     (current: $DB_USER)" -ForegroundColor Gray
    Write-Host "  DATABASE_PASSWORD (current: ****)" -ForegroundColor Gray
    Write-Host "  DATABASE_NAME     (current: $DB_NAME)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You can also run this script with parameters:" -ForegroundColor Yellow
    Write-Host "  .\apply-rls-fix.ps1 -Host localhost -Port 5432 -User postgres -Database agrinova" -ForegroundColor Gray
    exit 1
}

# Set defaults
if (-not $DB_PORT) { $DB_PORT = "5432" }

Write-Host "Database Configuration:" -ForegroundColor Green
Write-Host "  Host:     $DB_HOST" -ForegroundColor Gray
Write-Host "  Port:     $DB_PORT" -ForegroundColor Gray
Write-Host "  User:     $DB_USER" -ForegroundColor Gray
Write-Host "  Database: $DB_NAME" -ForegroundColor Gray
Write-Host ""

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "ERROR: psql command not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install PostgreSQL client tools and add to PATH." -ForegroundColor Yellow
    Write-Host "Download from: https://www.postgresql.org/download/" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found psql at: $($psqlPath.Source)" -ForegroundColor Green
Write-Host ""

# Set PGPASSWORD environment variable for automatic authentication
$env:PGPASSWORD = $DB_PASSWORD

# Apply the SQL fix
Write-Host "Applying RLS context functions fix..." -ForegroundColor Cyan
Write-Host ""

$sqlFile = "fix_rls_functions.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "ERROR: SQL file not found: $sqlFile" -ForegroundColor Red
    Write-Host "Please ensure fix_rls_functions.sql is in the current directory." -ForegroundColor Yellow
    exit 1
}

# Execute the SQL file
try {
    $result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $sqlFile 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS! RLS context functions have been created." -ForegroundColor Green
        Write-Host ""
        Write-Host "The following functions are now available:" -ForegroundColor Cyan
        Write-Host "  - app_set_user_context()" -ForegroundColor Gray
        Write-Host "  - app_get_user_id()" -ForegroundColor Gray
        Write-Host "  - app_get_user_role()" -ForegroundColor Gray
        Write-Host "  - app_get_company_ids()" -ForegroundColor Gray
        Write-Host "  - app_get_estate_ids()" -ForegroundColor Gray
        Write-Host "  - app_get_division_ids()" -ForegroundColor Gray
        Write-Host "  - app_clear_user_context()" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Your Go backend should now start without the RLS context error." -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "ERROR: Failed to apply SQL fix!" -ForegroundColor Red
        Write-Host ""
        Write-Host "psql output:" -ForegroundColor Yellow
        Write-Host $result -ForegroundColor Gray
        exit 1
    }
} catch {
    Write-Host "ERROR: Exception occurred while running psql!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
    exit 1
} finally {
    # Clear the password from environment
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Fix applied successfully!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
