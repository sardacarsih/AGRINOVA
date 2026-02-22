# Windows Production Auto Deploy (GitHub Releases)

Dokumen ini adalah runbook deployment produksi untuk skenario:
1. Build dilakukan di GitHub Actions (dipicu oleh git tag `v*.*.*`).
2. GitHub Actions membuat **GitHub Release** dengan ZIP artifact terlampir.
3. Server Windows mendeteksi release baru dan mengunduh ZIP tersebut.
4. Backend wajib menjalankan `agrinova-migrate.exe` sebelum `agrinova-server.exe`.

## Alur end-to-end

1. Developer push git tag: `git tag -a v1.2.3 -m "..." && git push origin v1.2.3`
2. GitHub Actions menjalankan `backend-web-release.yml` → validate → build → create GitHub Release.
3. Release berisi ZIP `agrinova-production-1.2.3.zip` (backend + web).
4. Server menjalankan `deploy.ps1` (manual/terjadwal).
5. `deploy.ps1` cek `/releases/latest`, bandingkan tag dengan versi aktif, download ZIP jika ada versi baru.
6. Extract, deploy ke `releases`, update `current`, restart service, health check.
7. Jika health check gagal, script rollback otomatis ke release sebelumnya.

## 1) Sisi Laptop Development

1. Pastikan file ini ada di repo:
- `.github/workflows/backend-web-release.yml`
- `.github/workflows/android-release.yml`
- `scripts/windows-production/deploy.ps1`
- `scripts/windows-production/run-backend.ps1`
- `scripts/windows-production/run-web.ps1`

2. Push git tag untuk rilis:

```bash
git tag -a v1.0.0 -m "Rilis pertama" && git push origin v1.0.0
```

Cek hasil:
- GitHub Actions → tab **Actions** → workflow `Backend & Web Release` harus sukses
- GitHub → tab **Releases** → release `v1.0.0` harus muncul dengan asset ZIP


3. Verifikasi cepat sebelum push (opsional):
- Backend: pastikan build menghasilkan `agrinova-migrate.exe` dan `agrinova-server.exe`.
- Web: pastikan `npm run build:standalone` sukses.

Perintah cek cepat:
cd d:\VSCODE\agrinova\apps\golang

# Build backend artifact (Windows)
powershell -ExecutionPolicy Bypass -File .\scripts\package-binaries.ps1 -TargetOS windows -TargetArch amd64 -ReleaseName verify-backend

# Verifikasi file exe
Get-ChildItem .\release\verify-backend\*.exe
Test-Path .\release\verify-backend\agrinova-migrate.exe
Test-Path .\release\verify-backend\agrinova-server.exe

cd d:\VSCODE\agrinova\apps\web

# Build standalone
npm ci
npm run build:standalone

# Verifikasi output standalone
Test-Path .\.next\standalone
Test-Path .\.next\static
Kalau Test-Path hasilnya True, berarti lolos verifikasi.

## 2) Sisi GitHub

1. Workflow yang dipakai:
- File: `.github/workflows/backend-web-release.yml`
- Trigger: `push` git tag `v*.*.*`

2. Output workflow:
- GitHub Release dengan tag `v1.2.3`
- Asset ZIP: `agrinova-production-1.2.3.zip`
- Struktur minimum di dalam ZIP:
  - `backend/`
  - `web/`
  - `VERSION.txt` (berisi semver `1.2.3`)
  - `MANIFEST.json`

3. Cek hasil di GitHub:
- Buka `Releases` → pastikan release `v1.2.3` ada dan statusnya bukan draft.
- Pastikan asset ZIP `agrinova-production-1.2.3.zip` terlampir.

## 3) Sisi Server Production (Windows)

### 3.1 One-time setup

1. Buat struktur folder:
- `D:\agrinova\backend\config`
- `D:\agrinova\backend\current`
- `D:\agrinova\backend\releases`
- `D:\agrinova\web\config`
- `D:\agrinova\web\current`
- `D:\agrinova\web\releases`
- `D:\agrinova\deploy\logs`
- `D:\agrinova\deploy\state`
- `D:\agrinova\deploy\temp`

2. Copy script ke server:
- `run-backend.ps1` -> `D:\agrinova\backend\config\run-backend.ps1`
- `run-web.ps1` -> `D:\agrinova\web\config\run-web.ps1`
- `deploy.ps1` -> `D:\agrinova\deploy\deploy.ps1`

3. Pastikan file env production:
- Go: `D:\agrinova\backend\config\.env`
- Web: `D:\agrinova\web\config\.env`

4. Set GitHub token di server:
```powershell
[Environment]::SetEnvironmentVariable("AGRINOVA_GH_TOKEN", "<YOUR_GITHUB_TOKEN>", "Machine")
```

### 3.2 Setup service (NSSM contoh)

Backend:
```powershell
nssm install agrinova-backend powershell.exe "-ExecutionPolicy Bypass -File D:\agrinova\backend\config\run-backend.ps1"
nssm set agrinova-backend AppDirectory D:\agrinova\backend\current
```

Web:
```powershell
nssm install agrinova-web powershell.exe "-ExecutionPolicy Bypass -File D:\agrinova\web\config\run-web.ps1"
nssm set agrinova-web AppDirectory D:\agrinova\web\current
```

Catatan:
- `run-backend.ps1` akan selalu:
  1. load env dari `D:\agrinova\backend\config\.env`
  2. run `agrinova-migrate.exe`
  3. jika sukses baru run `agrinova-server.exe`
- Default mode script adalah `production`.
- Jika butuh menjalankan script dalam mode development:
  - `run-backend.ps1 -Environment development`
  - `run-web.ps1 -Environment development`
  - Mode development akan mencari `.env` default lokal (jika ada), bukan fixed production path.

### 3.3 Deploy manual pertama (wajib)

```powershell
powershell -ExecutionPolicy Bypass -File D:\agrinova\deploy\deploy.ps1 `
  -RepoOwner "<GITHUB_OWNER>" `
  -RepoName "<GITHUB_REPO>"
```

Validasi:
1. Service `agrinova-backend` dan `agrinova-web` status `Running`.
2. `D:\agrinova\backend\current` dan `D:\agrinova\web\current` terisi artifact terbaru.
3. Health check:
- `http://127.0.0.1:8080/health`
- `http://127.0.0.1:3000`
4. Folder upload backend tetap ada:
- `D:\agrinova\backend\current\uploads`
- Deploy script mengecualikan folder `uploads` saat sync release -> current agar foto tidak ikut terhapus.
- Rekomendasi terbaik: simpan upload di luar folder `current` dengan env `AGRINOVA_UPLOADS_DIR` (contoh: `D:\agrinova\backend\data\uploads`).

### 3.4 Aktifkan auto deploy terjadwal

```powershell
schtasks /Create /SC MINUTE /MO 5 /TN "AgrinovaAutoDeploy" /TR "powershell -ExecutionPolicy Bypass -File D:\agrinova\deploy\deploy.ps1 -RepoOwner <GITHUB_OWNER> -RepoName <GITHUB_REPO>" /RU SYSTEM
```

## 4) Operasional harian

1. Developer push git tag: `git tag -a v1.2.3 -m "Catatan rilis" && git push origin v1.2.3`
2. GitHub Actions build dan buat GitHub Release.
3. Task Scheduler menjalankan `deploy.ps1` setiap 5 menit.
4. Jika tag release lebih baru dari `deployed-version.txt`, server download dan deploy.
5. Jika health check gagal, rollback otomatis ke versi sebelumnya.

## 5) Parameter penting `deploy.ps1`

- `-RepoOwner` (wajib)
- `-RepoName` (wajib)
- `-ReleaseTag` default: `latest` (otomatis ambil release terbaru; atau spesifik: `v1.2.3`)
- `-BackendServiceName` default: `agrinova-backend`
- `-WebServiceName` default: `agrinova-web`
- `-BackendHealthUrl` default: `http://127.0.0.1:8080/health`
- `-WebHealthUrl` default: `http://127.0.0.1:3000`

### Contoh deploy ke versi spesifik (rollforward / pinned):
```powershell
.\deploy.ps1 -RepoOwner sardacarsih -RepoName AGRINOVA -ReleaseTag v1.2.1
```

## 6) Policy env loading

1. Go backend source code:
- Development: default lookup `.env`.
- Production: wajib load `D:\agrinova\backend\config\.env`.

2. Web runtime:
- Development: default env dari proses / `.env` lokal.
- Production wrapper (`run-web.ps1`): wajib load `D:\agrinova\web\config\.env`.

## 7) Troubleshooting singkat

1. Error `AGRINOVA_GH_TOKEN is not set`:
- Set ulang environment variable machine, lalu restart service/task host.

2. Deploy sukses tapi app tidak jalan:
- Cek log `D:\agrinova\deploy\logs`.
- Cek service log NSSM.
- Pastikan `.env` ada di path config yang benar.

3. Backend gagal start setelah deploy:
- Pastikan migration binary ada di `D:\agrinova\backend\current\agrinova-migrate.exe`.
- Periksa hasil migrate (schema/DB credentials).
- Pastikan path `AGRINOVA_UPLOADS_DIR` ada dan bisa ditulis oleh service account.

4. Release atau asset tidak ditemukan:
- Pastikan workflow `backend-web-release.yml` selesai sukses.
- Buka GitHub → Releases, pastikan release tidak berstatus draft.
- Pastikan asset ZIP `agrinova-production-*.zip` terlampir di release.
- Pastikan `AGRINOVA_GH_TOKEN` punya scope `repo` (untuk repo private) atau `public_repo`.

5. Foto/upload hilang setelah deploy:
- Pastikan server menggunakan `deploy.ps1` versi terbaru (sudah exclude `uploads` dari proses mirror ke `current`).
- Pindahkan upload ke lokasi persisten via `AGRINOVA_UPLOADS_DIR` (mis. `D:\agrinova\backend\data\uploads`) lalu backup lokasi tersebut secara berkala.
