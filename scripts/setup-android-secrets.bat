@echo off
setlocal enabledelayedexpansion

REM ──────────────────────────────────────────────────────────────────────────────
REM Agrinova — Setup GitHub Secrets untuk Android Release
REM
REM Cara pakai:
REM   scripts\setup-android-secrets.bat
REM
REM Prasyarat:
REM   - GitHub CLI (gh) sudah terinstall dan sudah login (gh auth login)
REM   - File keystore dan google-services.json tersedia
REM
REM Secrets yang di-setup:
REM   KEYSTORE_BASE64                 keystore release (.jks/.keystore)
REM   STORE_PASSWORD                  keystore store password
REM   KEY_ALIAS                       key alias
REM   KEY_PASSWORD                    key password
REM   GOOGLE_SERVICES_JSON_BASE64     google-services.json (opsional, jika tidak di-commit)
REM   PLAY_STORE_SERVICE_ACCOUNT_JSON raw JSON service account GCP
REM ──────────────────────────────────────────────────────────────────────────────

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "REPO_OWNER=sardacarsih"
set "REPO_NAME=AGRINOVA"

echo.
echo ===============================================
echo   Agrinova Android Secrets Setup
echo   Repo: %REPO_OWNER%/%REPO_NAME%
echo ===============================================
echo.

REM ── Cek gh CLI tersedia ───────────────────────────────────────────────────
where gh >nul 2>&1
if errorlevel 1 (
  echo [ERROR] GitHub CLI (gh) tidak ditemukan.
  echo         Install dari: https://cli.github.com/
  pause & exit /b 1
)

REM ── Cek sudah login ───────────────────────────────────────────────────────
gh auth status >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Belum login ke GitHub CLI.
  echo         Jalankan: gh auth login
  pause & exit /b 1
)

cd /d "%ROOT_DIR%"

echo Pilih secret yang ingin di-setup:
echo   1. KEYSTORE_BASE64 + password-password (signing key)
echo   2. PLAY_STORE_SERVICE_ACCOUNT_JSON (upload ke Play Store)
echo   3. GOOGLE_SERVICES_JSON_BASE64 (opsional - hanya jika tidak di-commit)
echo   4. Semua di atas
echo   5. Keluar
echo.
set /p "PILIHAN=Pilihan (1-5): "

if "%PILIHAN%"=="5" exit /b 0
if "%PILIHAN%"=="1" goto setup_keystore
if "%PILIHAN%"=="2" goto setup_playstore
if "%PILIHAN%"=="3" goto setup_google_services
if "%PILIHAN%"=="4" goto setup_all

echo [ERROR] Pilihan tidak valid.
pause & exit /b 1

REM ═══════════════════════════════════════════════════════════════════════════
:setup_keystore
echo.
echo ── Setup Keystore ──────────────────────────────────────────────────────
echo.

REM Path default keystore yang sudah ada di repo (dev key)
set "DEFAULT_KEYSTORE=%ROOT_DIR%\apps\mobile\android\app\agrinova-release-key.keystore"
if exist "%DEFAULT_KEYSTORE%" (
  echo Keystore ditemukan: apps\mobile\android\app\agrinova-release-key.keystore
  set /p "KEYSTORE_PATH=Path keystore (Enter untuk pakai default): "
  if "!KEYSTORE_PATH!"=="" set "KEYSTORE_PATH=%DEFAULT_KEYSTORE%"
) else (
  set /p "KEYSTORE_PATH=Path file keystore (.jks/.keystore): "
)

if not exist "!KEYSTORE_PATH!" (
  echo [ERROR] File tidak ditemukan: !KEYSTORE_PATH!
  goto end_error
)

echo Encode dan upload KEYSTORE_BASE64...
REM Gunakan PowerShell agar tidak ada batas panjang variabel CMD dan encoding binary benar
powershell -NoProfile -Command ^
  "[Convert]::ToBase64String([IO.File]::ReadAllBytes('!KEYSTORE_PATH!'))" ^
  | gh secret set KEYSTORE_BASE64 --repo "%REPO_OWNER%/%REPO_NAME%"
if errorlevel 1 (echo [ERROR] Gagal upload KEYSTORE_BASE64. & goto end_error)
echo   OK: KEYSTORE_BASE64

echo.
set /p "STORE_PASS=STORE_PASSWORD: "
echo !STORE_PASS! | gh secret set STORE_PASSWORD --repo "%REPO_OWNER%/%REPO_NAME%"
if errorlevel 1 (echo [ERROR] Gagal upload STORE_PASSWORD. & goto end_error)
echo   OK: STORE_PASSWORD

set /p "KEY_ALIAS_VAL=KEY_ALIAS: "
echo !KEY_ALIAS_VAL! | gh secret set KEY_ALIAS --repo "%REPO_OWNER%/%REPO_NAME%"
if errorlevel 1 (echo [ERROR] Gagal upload KEY_ALIAS. & goto end_error)
echo   OK: KEY_ALIAS

set /p "KEY_PASS=KEY_PASSWORD: "
echo !KEY_PASS! | gh secret set KEY_PASSWORD --repo "%REPO_OWNER%/%REPO_NAME%"
if errorlevel 1 (echo [ERROR] Gagal upload KEY_PASSWORD. & goto end_error)
echo   OK: KEY_PASSWORD

if "%PILIHAN%"=="4" goto setup_playstore
goto end_ok

REM ═══════════════════════════════════════════════════════════════════════════
:setup_playstore
echo.
echo ── Setup Play Store Service Account ────────────────────────────────────
echo.
echo File JSON service account bisa diunduh dari:
echo   Google Cloud Console → IAM → Service Accounts → Keys
echo   (Role: Release Manager di Play Console)
echo.
set /p "SA_JSON_PATH=Path file service-account.json: "

if not exist "!SA_JSON_PATH!" (
  echo [ERROR] File tidak ditemukan: !SA_JSON_PATH!
  goto end_error
)

gh secret set PLAY_STORE_SERVICE_ACCOUNT_JSON --repo "%REPO_OWNER%/%REPO_NAME%" < "!SA_JSON_PATH!"
if errorlevel 1 (echo [ERROR] Gagal upload PLAY_STORE_SERVICE_ACCOUNT_JSON. & goto end_error)
echo   OK: PLAY_STORE_SERVICE_ACCOUNT_JSON

if "%PILIHAN%"=="4" goto setup_google_services
goto end_ok

REM ═══════════════════════════════════════════════════════════════════════════
:setup_google_services
echo.
echo ── Setup Google Services JSON (opsional) ───────────────────────────────
echo.
echo CATATAN: google-services.json sudah di-commit ke repo.
echo          Secret ini hanya diperlukan jika ingin meng-override
echo          dengan konfigurasi production yang berbeda.
echo.
set "DEFAULT_GSJ=%ROOT_DIR%\apps\mobile\android\app\google-services.json"
if exist "%DEFAULT_GSJ%" (
  echo File ditemukan: apps\mobile\android\app\google-services.json
  set /p "GSJ_PATH=Path google-services.json (Enter untuk pakai default): "
  if "!GSJ_PATH!"=="" set "GSJ_PATH=%DEFAULT_GSJ%"
) else (
  set /p "GSJ_PATH=Path google-services.json: "
)

if not exist "!GSJ_PATH!" (
  echo [ERROR] File tidak ditemukan: !GSJ_PATH!
  goto end_error
)

powershell -NoProfile -Command ^
  "[Convert]::ToBase64String([IO.File]::ReadAllBytes('!GSJ_PATH!'))" ^
  | gh secret set GOOGLE_SERVICES_JSON_BASE64 --repo "%REPO_OWNER%/%REPO_NAME%"
if errorlevel 1 (echo [ERROR] Gagal upload GOOGLE_SERVICES_JSON_BASE64. & goto end_error)
echo   OK: GOOGLE_SERVICES_JSON_BASE64

goto end_ok

REM ═══════════════════════════════════════════════════════════════════════════
:setup_all
call :setup_keystore
call :setup_playstore
call :setup_google_services
goto end_ok

REM ═══════════════════════════════════════════════════════════════════════════
:end_ok
echo.
echo ===============================================
echo   Secrets berhasil di-setup!
echo ===============================================
echo.
echo   Cek di: https://github.com/%REPO_OWNER%/%REPO_NAME%/settings/secrets/actions
echo.
pause
endlocal
exit /b 0

:end_error
echo.
pause
endlocal
exit /b 1
