@echo off
setlocal EnableExtensions

set "EMU_ID=Pixel_6_API_36_A"
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

rem If target AVD is already running, return success instead of failing launch.
set "ADB_BIN="
for /f "delims=" %%I in ('where adb 2^>nul') do (
  set "ADB_BIN=%%I"
  goto :adb_check
)
:adb_check

if defined ADB_BIN (
  for /f "skip=1 tokens=1,2" %%D in ('"%ADB_BIN%" devices') do (
    if /I "%%E"=="device" (
      echo %%D | findstr /R "emulator-[0-9][0-9][0-9][0-9]" >nul
      if not errorlevel 1 (
        "%ADB_BIN%" -s %%D emu avd name 2>nul | findstr /I /C:"%EMU_ID%" >nul
        if not errorlevel 1 (
          echo Emulator "%EMU_ID%" is already running on %%D.
          exit /b 0
        )
      )
    )
  )
)

echo Launching emulator: %EMU_ID%
flutter emulators --launch "%EMU_ID%"
exit /b %ERRORLEVEL%
