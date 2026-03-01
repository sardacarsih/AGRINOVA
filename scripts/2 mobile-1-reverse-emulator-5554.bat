@echo off
setlocal EnableExtensions

set "SERIAL=emulator-5554"
set "PORT=8080"
if not "%~1"=="" set "SERIAL=%~1"
if not "%~2"=="" set "PORT=%~2"

set "ADB_CMD=adb"
if defined ANDROID_SDK_ROOT if exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" set "ADB_CMD=%ANDROID_SDK_ROOT%\platform-tools\adb.exe"
if defined ANDROID_HOME if exist "%ANDROID_HOME%\platform-tools\adb.exe" set "ADB_CMD=%ANDROID_HOME%\platform-tools\adb.exe"
if exist "D:\Android\Sdk\platform-tools\adb.exe" set "ADB_CMD=D:\Android\Sdk\platform-tools\adb.exe"

if not exist "%ADB_CMD%" (
  where adb >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] adb command not found in PATH.
    exit /b 1
  )
)

"%ADB_CMD%" start-server >nul 2>&1
echo Running adb reverse on %SERIAL%: tcp:%PORT% -^> tcp:%PORT%
"%ADB_CMD%" -s %SERIAL% reverse tcp:%PORT% tcp:%PORT%
if errorlevel 1 (
  echo [ERROR] adb reverse failed on %SERIAL%.
  exit /b 1
)

echo Reverse list on %SERIAL%:
"%ADB_CMD%" -s %SERIAL% reverse --list
exit /b 0
