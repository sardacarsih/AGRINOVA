@echo off
setlocal

REM Double-click deploy launcher for Windows production server.
REM Place this file in the same folder as deploy.ps1 (recommended: D:\agrinova\deploy).

set "SCRIPT_DIR=%~dp0"
set "DEPLOY_SCRIPT=%SCRIPT_DIR%deploy.ps1"
set "REPO_OWNER=sardacarsih"
set "REPO_NAME=AGRINOVA"

if not exist "%DEPLOY_SCRIPT%" (
  echo [ERROR] deploy.ps1 not found: %DEPLOY_SCRIPT%
  echo Copy deploy.ps1 to this folder first.
  pause
  exit /b 1
)

echo ===============================================
echo Agrinova Manual Production Deploy
echo Repo   : %REPO_OWNER%/%REPO_NAME%
echo Script : %DEPLOY_SCRIPT%
echo ===============================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%DEPLOY_SCRIPT%" -RepoOwner "%REPO_OWNER%" -RepoName "%REPO_NAME%"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  echo [OK] Deployment finished successfully.
) else (
  echo [FAILED] Deployment finished with exit code %EXIT_CODE%.
)

pause
exit /b %EXIT_CODE%
