@echo off
setlocal enabledelayedexpansion

REM ──────────────────────────────────────────────────────────────────────────────
REM Agrinova Android Release Script
REM
REM Cara pakai:
REM   scripts\release-android.bat          (interaktif, minta input versi)
REM   scripts\release-android.bat 1.2.3    (langsung beri versi)
REM
REM Apa yang dilakukan:
REM   1. Cek working tree bersih (tidak ada uncommitted changes)
REM   2. Minta versi dan catatan rilis
REM   3. Buat annotated git tag (v1.2.3)
REM   4. Push tag ke remote → memicu GitHub Actions android-release.yml
REM   5. Tampilkan link Actions untuk memantau progress
REM ──────────────────────────────────────────────────────────────────────────────

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "REPO_OWNER=sardacarsih"
set "REPO_NAME=AGRINOVA"

echo.
echo ===============================================
echo   Agrinova Android Release
echo   Repo: %REPO_OWNER%/%REPO_NAME%
echo ===============================================
echo.

REM ── Masuk ke root repo ─────────────────────────────────────────────────────
cd /d "%ROOT_DIR%"
if errorlevel 1 (
  echo [ERROR] Tidak bisa masuk ke root repo: %ROOT_DIR%
  pause & exit /b 1
)

REM ── Cek git tersedia ───────────────────────────────────────────────────────
where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] git tidak ditemukan. Install Git terlebih dahulu.
  pause & exit /b 1
)

REM ── Cek branch ────────────────────────────────────────────────────────────
for /f "tokens=*" %%B in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "CURRENT_BRANCH=%%B"
if not "%CURRENT_BRANCH%"=="main" (
  echo [PERINGATAN] Branch saat ini: %CURRENT_BRANCH%
  echo              Biasanya release dibuat dari branch 'main'.
  echo.
  set /p "CONTINUE=Lanjutkan dari branch ini? (y/N): "
  if /i not "!CONTINUE!"=="y" (
    echo Dibatalkan.
    pause & exit /b 0
  )
)

REM ── Cek working tree bersih ────────────────────────────────────────────────
for /f "tokens=*" %%S in ('git status --porcelain 2^>nul') do (
  echo [ERROR] Working tree tidak bersih. Commit atau stash perubahan terlebih dahulu.
  echo.
  git status --short
  pause & exit /b 1
)

REM ── Ambil versi ───────────────────────────────────────────────────────────
if not "%~1"=="" (
  set "VERSION=%~1"
) else (
  REM Tampilkan tag terakhir sebagai referensi
  for /f "tokens=*" %%T in ('git tag --sort=-version:refname 2^>nul ^| findstr /r "^v[0-9]"') do (
    if "!LAST_TAG!"=="" set "LAST_TAG=%%T"
  )
  if not "!LAST_TAG!"=="" echo Tag terakhir: !LAST_TAG!
  echo.
  set /p "VERSION=Masukkan versi rilis (contoh: 1.2.3): "
)

REM ── Validasi format versi ─────────────────────────────────────────────────
echo %VERSION% | findstr /r "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*$" >nul
if errorlevel 1 (
  echo [ERROR] Format versi tidak valid: '%VERSION%'
  echo         Gunakan format: MAJOR.MINOR.PATCH (contoh: 1.2.3)
  pause & exit /b 1
)

set "TAG=v%VERSION%"

REM ── Cek tag belum ada ──────────────────────────────────────────────────────
git tag -l "%TAG%" | findstr /i "%TAG%" >nul 2>&1
if not errorlevel 1 (
  echo [ERROR] Tag '%TAG%' sudah ada.
  git log -1 --oneline "%TAG%"
  pause & exit /b 1
)

REM ── Minta catatan rilis ────────────────────────────────────────────────────
echo.
echo Catatan rilis untuk %TAG% (tekan Enter untuk skip, gunakan default):
set /p "RELEASE_NOTES=Catatan rilis: "
if "!RELEASE_NOTES!"=="" (
  set "RELEASE_NOTES=Perbaikan bug dan peningkatan performa untuk versi %VERSION%."
)

REM ── Konfirmasi ────────────────────────────────────────────────────────────
echo.
echo ─────────────────────────────────────────
echo   Tag      : %TAG%
echo   Branch   : %CURRENT_BRANCH%
echo   Catatan  : !RELEASE_NOTES!
echo ─────────────────────────────────────────
echo.
set /p "CONFIRM=Buat tag dan push ke GitHub? (y/N): "
if /i not "!CONFIRM!"=="y" (
  echo Dibatalkan.
  pause & exit /b 0
)

REM ── Buat annotated tag ────────────────────────────────────────────────────
echo.
echo [1/2] Membuat tag %TAG%...
git tag -a "%TAG%" -m "!RELEASE_NOTES!"
if errorlevel 1 (
  echo [ERROR] Gagal membuat tag.
  pause & exit /b 1
)
echo       OK

REM ── Push tag ke remote ────────────────────────────────────────────────────
echo [2/2] Push tag ke origin...
git push origin "%TAG%"
if errorlevel 1 (
  echo [ERROR] Gagal push tag. Cek koneksi dan akses ke remote.
  git tag -d "%TAG%"
  echo       Tag lokal '%TAG%' dihapus.
  pause & exit /b 1
)
echo       OK

REM ── Selesai ───────────────────────────────────────────────────────────────
echo.
echo ===============================================
echo   Release %TAG% berhasil dipicu!
echo ===============================================
echo.
echo   GitHub Actions:
echo   https://github.com/%REPO_OWNER%/%REPO_NAME%/actions
echo.
echo   Setelah build selesai, AAB akan di-upload ke Play Store
echo   alpha track. Promosikan ke beta/production di:
echo   https://play.google.com/console
echo.

pause
endlocal
