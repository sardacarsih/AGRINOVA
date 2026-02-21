#!/bin/bash
# ================================================================
# Apply RLS Context Functions Fix
# ================================================================
# This bash script applies the RLS context functions to your
# PostgreSQL database to fix the missing app_set_user_context error
# ================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}Agrinova RLS Functions Fix${NC}"
echo -e "${CYAN}======================================${NC}"
echo ""

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}Loading database configuration from .env...${NC}"
    export $(grep -v '^#' .env | xargs)
fi

# Get database configuration from environment variables
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_USER="${DATABASE_USER}"
DB_PASSWORD="${DATABASE_PASSWORD}"
DB_NAME="${DATABASE_NAME}"

# Validate configuration
if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo -e "${RED}ERROR: Missing database configuration!${NC}"
    echo ""
    echo -e "${YELLOW}Please set the following environment variables:${NC}"
    echo -e "${GRAY}  DATABASE_HOST     (current: $DB_HOST)${NC}"
    echo -e "${GRAY}  DATABASE_PORT     (current: $DB_PORT)${NC}"
    echo -e "${GRAY}  DATABASE_USER     (current: $DB_USER)${NC}"
    echo -e "${GRAY}  DATABASE_PASSWORD (current: ****)${NC}"
    echo -e "${GRAY}  DATABASE_NAME     (current: $DB_NAME)${NC}"
    echo ""
    echo -e "${YELLOW}You can also run this script with parameters:${NC}"
    echo -e "${GRAY}  ./apply-rls-fix.sh${NC}"
    exit 1
fi

echo -e "${GREEN}Database Configuration:${NC}"
echo -e "${GRAY}  Host:     $DB_HOST${NC}"
echo -e "${GRAY}  Port:     $DB_PORT${NC}"
echo -e "${GRAY}  User:     $DB_USER${NC}"
echo -e "${GRAY}  Database: $DB_NAME${NC}"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}ERROR: psql command not found!${NC}"
    echo ""
    echo -e "${YELLOW}Please install PostgreSQL client tools.${NC}"
    echo -e "${YELLOW}  Ubuntu/Debian: sudo apt-get install postgresql-client${NC}"
    echo -e "${YELLOW}  macOS:         brew install postgresql${NC}"
    echo -e "${YELLOW}  RHEL/CentOS:   sudo yum install postgresql${NC}"
    exit 1
fi

PSQL_VERSION=$(psql --version)
echo -e "${GREEN}Found psql: $PSQL_VERSION${NC}"
echo ""

# Set PGPASSWORD environment variable for automatic authentication
export PGPASSWORD="$DB_PASSWORD"

# Apply the SQL fix
echo -e "${CYAN}Applying RLS context functions fix...${NC}"
echo ""

SQL_FILE="fix_rls_functions.sql"
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}ERROR: SQL file not found: $SQL_FILE${NC}"
    echo -e "${YELLOW}Please ensure fix_rls_functions.sql is in the current directory.${NC}"
    exit 1
fi

# Execute the SQL file
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"; then
    echo ""
    echo -e "${GREEN}SUCCESS! RLS context functions have been created.${NC}"
    echo ""
    echo -e "${CYAN}The following functions are now available:${NC}"
    echo -e "${GRAY}  - app_set_user_context()${NC}"
    echo -e "${GRAY}  - app_get_user_id()${NC}"
    echo -e "${GRAY}  - app_get_user_role()${NC}"
    echo -e "${GRAY}  - app_get_company_ids()${NC}"
    echo -e "${GRAY}  - app_get_estate_ids()${NC}"
    echo -e "${GRAY}  - app_get_division_ids()${NC}"
    echo -e "${GRAY}  - app_clear_user_context()${NC}"
    echo ""
    echo -e "${GREEN}Your Go backend should now start without the RLS context error.${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}ERROR: Failed to apply SQL fix!${NC}"
    echo -e "${YELLOW}Please check the error messages above.${NC}"
    exit 1
fi

# Clear the password from environment
unset PGPASSWORD

echo -e "${CYAN}======================================${NC}"
echo -e "${GREEN}Fix applied successfully!${NC}"
echo -e "${CYAN}======================================${NC}"
