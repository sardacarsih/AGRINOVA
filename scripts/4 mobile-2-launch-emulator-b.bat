@echo off
setlocal EnableExtensions

set "EMU_ID=Pixel_6_API_36_B"
if not "%~1"=="" set "EMU_ID=%~1"

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "ROOT_DIR=%%~fI"
set "MOBILE_DIR=%ROOT_DIR%\apps\mobile"

where flutter >nul 2>&1
if errorlevel 1 (
  echo [ERROR] flutter command not found in PATH.
  exit /b 1
)

if not exist "%MOBILE_DIR%\pubspec.yaml" (
  echo [ERROR] Flutter app folder not found: %MOBILE_DIR%
  exit /b 1
)

cd /d "%MOBILE_DIR%"
echo Launching emulator: %EMU_ID%
flutter emulators --launch "%EMU_ID%"
exit /b %ERRORLEVEL%
