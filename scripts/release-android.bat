@echo off
setlocal enabledelayedexpansion

REM ──────────────────────────────────────────────────────────────────────────────
REM Agrinova Android Release Script
REM
REM Cara pakai:
REM   scripts\release-android.bat          (interaktif, minta input versi)
REM   scripts\release-android.bat 1.2.3    (langsung beri versi)
REM
REM Alur lengkap:
REM   1. flutter analyze apps/mobile/ — blokir jika ada error
REM   2. Tampilkan status git dan commit terakhir
REM   3. Commit semua perubahan pending (jika ada)
REM   4. Push commits ke GitHub (main)
REM   5. Minta versi dan catatan rilis
REM   6. Buat annotated git tag (v1.2.3)
REM   7. Push tag → memicu GitHub Actions android-release.yml
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
if not "!CURRENT_BRANCH!"=="main" (
  echo [PERINGATAN] Branch saat ini: !CURRENT_BRANCH!
  echo              Biasanya release dibuat dari branch 'main'.
  echo.
  set /p "CONTINUE=Lanjutkan dari branch ini? (y/N): "
  if /i not "!CONTINUE!"=="y" (
    echo Dibatalkan.
    pause & exit /b 0
  )
)

REM ── Flutter analyze ───────────────────────────────────────────────────────
echo ── Flutter analyze apps/mobile/ ───────────────────────────────────────
where flutter >nul 2>&1
if errorlevel 1 (
  echo [ERROR] flutter tidak ditemukan. Pastikan Flutter SDK ada di PATH.
  pause & exit /b 1
)
pushd "%ROOT_DIR%\apps\mobile"
flutter analyze
set "ANALYZE_RESULT=%ERRORLEVEL%"
popd
if not "%ANALYZE_RESULT%"=="0" (
  echo.
  echo [ERROR] flutter analyze gagal. Perbaiki error di atas sebelum release.
  pause & exit /b 1
)
echo   OK: flutter analyze lulus.
echo.

REM ── Tampilkan commit terakhir ──────────────────────────────────────────────
echo ── Commit terakhir ─────────────────────────────────────────────────────
git log --oneline -5
echo.

REM ── Tampilkan status apps/mobile/ ─────────────────────────────────────────
echo ── Status apps/mobile/ ─────────────────────────────────────────────────
set "MOBILE_DIRTY="
for /f "tokens=*" %%S in ('git status --porcelain -- apps/mobile 2^>nul') do set "MOBILE_DIRTY=1"
if defined MOBILE_DIRTY (
  git status --short -- apps/mobile
) else (
  echo   (tidak ada perubahan)
)
echo.

REM ── Tampilkan status keseluruhan ───────────────────────────────────────────
echo ── Status keseluruhan ──────────────────────────────────────────────────
set "ANY_DIRTY="
for /f "tokens=*" %%S in ('git status --porcelain 2^>nul') do set "ANY_DIRTY=1"
if defined ANY_DIRTY (
  git status --short
) else (
  echo   (working tree bersih)
)
echo.

REM ── Commit perubahan pending (jika ada) ───────────────────────────────────
if defined ANY_DIRTY (
  set /p "COMMIT_MSG=Pesan commit (Enter untuk pakai pesan otomatis): "
  if "!COMMIT_MSG!"=="" set "COMMIT_MSG=chore: update sebelum release Android"
  echo.
  echo Meng-stage semua perubahan...
  git add -A
  git commit -m "!COMMIT_MSG!"
  if errorlevel 1 (
    echo [ERROR] Gagal commit. Periksa pesan error di atas.
    pause & exit /b 1
  )
  echo   OK: commit berhasil.
  echo.
)

REM ── Push commits ke GitHub ─────────────────────────────────────────────────
echo ── Push commits ke GitHub ──────────────────────────────────────────────
git push origin "!CURRENT_BRANCH!"
if errorlevel 1 (
  echo [ERROR] Gagal push ke origin. Cek koneksi atau akses repo.
  pause & exit /b 1
)
echo   OK: commits ter-push ke origin/!CURRENT_BRANCH!.
echo.

REM ── Update whatsnew files ─────────────────────────────────────────────────
echo ── Catatan Rilis (whatsnew/) ────────────────────────────────────────────
set "WHATSNEW_ID=%ROOT_DIR%\apps\mobile\whatsnew\whatsnew-id"
set "WHATSNEW_EN=%ROOT_DIR%\apps\mobile\whatsnew\whatsnew-en-US"
echo.
echo Isi saat ini dari whatsnew-id:
echo ─────────────────────────────────────────
type "%WHATSNEW_ID%" 2>nul || echo   (file belum ada)
echo ─────────────────────────────────────────
echo.
set /p "EDIT_NOTES=Update catatan rilis di whatsnew/ sebelum tag? (y/N): "
if /i "!EDIT_NOTES!"=="y" (
  echo.
  echo Membuka whatsnew-id di Notepad. Simpan dan tutup untuk melanjutkan...
  notepad "%WHATSNEW_ID%"
  echo Membuka whatsnew-en-US di Notepad. Simpan dan tutup untuk melanjutkan...
  notepad "%WHATSNEW_EN%"
  echo.
  REM Commit & push whatsnew changes
  for /f "tokens=*" %%S in ('git status --porcelain -- apps/mobile/whatsnew 2^>nul') do set "NOTES_DIRTY=1"
  if defined NOTES_DIRTY (
    git add apps\mobile\whatsnew\
    git commit -m "chore(mobile): update release notes before release"
    if errorlevel 1 (
      echo [ERROR] Gagal commit whatsnew. Cek error di atas.
      pause & exit /b 1
    )
    git push origin "!CURRENT_BRANCH!"
    if errorlevel 1 (
      echo [ERROR] Gagal push whatsnew. Cek koneksi.
      pause & exit /b 1
    )
    echo   OK: catatan rilis diperbarui dan di-push.
  ) else (
    echo   Tidak ada perubahan pada whatsnew/.
  )
  echo.
)

REM ── Ambil versi ───────────────────────────────────────────────────────────
echo ── Buat Release Tag ────────────────────────────────────────────────────
if not "%~1"=="" (
  set "VERSION=%~1"
) else (
  for /f "tokens=*" %%T in ('git tag --sort=-version:refname 2^>nul ^| findstr /r "^v[0-9]"') do (
    if "!LAST_TAG!"=="" set "LAST_TAG=%%T"
  )
  if not "!LAST_TAG!"=="" echo Tag terakhir: !LAST_TAG!
  echo.
  set /p "VERSION=Masukkan versi rilis (contoh: 1.2.3): "
)

REM ── Validasi format versi ─────────────────────────────────────────────────
set "_VCHECK=%VERSION%"
for /l %%D in (0,1,9) do set "_VCHECK=!_VCHECK:%%D=!"
if not "!_VCHECK!"==".." (
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
echo Catatan rilis untuk %TAG% (tekan Enter untuk pakai default):
set /p "RELEASE_NOTES=Catatan rilis: "
if "!RELEASE_NOTES!"=="" (
  set "RELEASE_NOTES=Perbaikan bug dan peningkatan performa untuk versi %VERSION%."
)

REM ── Konfirmasi ────────────────────────────────────────────────────────────
echo.
echo ─────────────────────────────────────────
echo   Tag      : %TAG%
echo   Branch   : !CURRENT_BRANCH!
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
