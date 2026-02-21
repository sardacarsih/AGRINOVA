# Agrinova Login Testing with cURL (PowerShell)
# Tests WebLogin mutation using username-based credentials

$GRAPHQL_ENDPOINT = "http://localhost:8080/graphql"

Write-Host "🔐 Agrinova Login Testing with cURL" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Function to test login
function Test-Login {
    param(
        [string]$username,
        [string]$password,
        [string]$role
    )
    
    Write-Host "Testing: $role ($username)" -ForegroundColor Yellow
    Write-Host "-----------------------------------"
    
    $body = @{
        query = "mutation WebLogin(`$input: WebLoginInput!) { webLogin(input: `$input) { success message user { id username nama role } companies { id nama } sessionId } }"
        variables = @{
            input = @{
                identifier = $username
                password = $password
            }
        }
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri $GRAPHQL_ENDPOINT -Method Post -Body $body -ContentType "application/json"
        $response | ConvertTo-Json -Depth 10 | Write-Host
    }
    catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host ""
}

# Test all roles with username-based credentials
Write-Host "📋 Testing Legacy Username Credentials" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Test-Login "superadmin" "demo123" "Super Admin"
Test-Login "companyadmin" "demo123" "Company Admin"
Test-Login "manager" "demo123" "Manager"
Test-Login "asisten" "demo123" "Asisten"
Test-Login "mandor" "demo123" "Mandor"
Test-Login "satpam" "demo123" "Satpam"
Test-Login "TIMBANGAN" "demo123" "Timbangan"
Test-Login "GRADING" "demo123" "Grading"

Write-Host "✅ All login tests completed!" -ForegroundColor Green
