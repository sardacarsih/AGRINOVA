#!/bin/bash

# Agrinova Login Testing with cURL
# Tests WebLogin mutation using username-based credentials

GRAPHQL_ENDPOINT="http://localhost:8080/graphql"

echo "🔐 Agrinova Login Testing with cURL"
echo "===================================="
echo ""

# Function to test login
test_login() {
    local username=$1
    local password=$2
    local role=$3
    
    echo "Testing: $role ($username)"
    echo "-----------------------------------"
    
    curl -X POST "$GRAPHQL_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "{
            \"query\": \"mutation WebLogin(\$input: WebLoginInput!) { webLogin(input: \$input) { success message user { id username nama role } companies { id nama } sessionId } }\",
            \"variables\": {
                \"input\": {
                    \"identifier\": \"$username\",
                    \"password\": \"$password\"
                }
            }
        }" | jq '.'
    
    echo ""
    echo ""
}

# Test all roles with username-based credentials
echo "📋 Testing Legacy Username Credentials"
echo "========================================"
echo ""

test_login "superadmin" "demo123" "Super Admin"
test_login "companyadmin" "demo123" "Company Admin"
test_login "manager" "demo123" "Manager"
test_login "asisten" "demo123" "Asisten"
test_login "mandor" "demo123" "Mandor"
test_login "satpam" "demo123" "Satpam"
test_login "TIMBANGAN" "demo123" "Timbangan"
test_login "GRADING" "demo123" "Grading"

echo "✅ All login tests completed!"
