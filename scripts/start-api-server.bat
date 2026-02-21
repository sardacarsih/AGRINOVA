@echo off
setlocal
echo.
echo ===============================================
echo   Agrinova API Server Startup Manager
echo ===============================================
echo.

REM Resolve repo root (one level up from scripts/)
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."

REM Change to API directory
cd /d "%ROOT_DIR%\apps\golang"
if errorlevel 1 (
  echo ERROR: API directory not found: "%ROOT_DIR%\apps\golang"
  exit /b 1
)

REM Check if port 8080 is in use and kill if necessary
echo Checking port 8080 availability...
node "%ROOT_DIR%\scripts\port-manager.js" kill 8080

echo.
echo Starting Go GraphQL API Server...
echo    Server will be available at: http://localhost:8080/graphql
echo    Press Ctrl+C to stop the server
echo.

REM Start the API server
go run ./cmd/server/main.go

pause
endlocal
