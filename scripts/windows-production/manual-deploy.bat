@echo off
setlocal

REM Double-click deploy launcher for Windows production server.
REM Place this file in the same folder as deploy-backend.ps1 and deploy-web.ps1.

set "SCRIPT_DIR=%~dp0"
set "BACKEND_SCRIPT=%SCRIPT_DIR%deploy-backend.ps1"
set "WEB_SCRIPT=%SCRIPT_DIR%deploy-web.ps1"
set "REPO_OWNER=sardacarsih"
set "REPO_NAME=AGRINOVA"

if not exist "%BACKEND_SCRIPT%" (
  echo [ERROR] deploy-backend.ps1 not found: %BACKEND_SCRIPT%
  echo Copy deploy-backend.ps1 to this folder first.
  pause
  exit /b 1
)

if not exist "%WEB_SCRIPT%" (
  echo [ERROR] deploy-web.ps1 not found: %WEB_SCRIPT%
  echo Copy deploy-web.ps1 to this folder first.
  pause
  exit /b 1
)

echo ===============================================
echo Agrinova Manual Production Deploy
echo Repo   : %REPO_OWNER%/%REPO_NAME%
echo 1. Backend deploy
echo 2. Web deploy
echo ===============================================
set /p CHOICE=Select target (1/2): 
echo.

if "%CHOICE%"=="1" (
  set "DEPLOY_SCRIPT=%BACKEND_SCRIPT%"
) else if "%CHOICE%"=="2" (
  set "DEPLOY_SCRIPT=%WEB_SCRIPT%"
) else (
  echo [ERROR] Invalid selection. Use 1 or 2.
  pause
  exit /b 1
)

echo Script : %DEPLOY_SCRIPT%
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
