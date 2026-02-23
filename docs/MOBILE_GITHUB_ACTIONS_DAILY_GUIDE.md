# Panduan Lengkap Mobile Release Pipeline (GitHub Actions + Google Play)

Dokumen ini menjelaskan cara kerja pipeline mobile terbaru dan cara pakainya sehari-hari sebagai developer.

Referensi workflow: `.github/workflows/android-release.yml`

## 1. Tujuan dan Kebijakan Rilis

Pipeline mobile mengikuti kebijakan berikut:

- `develop` -> Play track `internal`
- `main` atau `release/*` -> Play track `closed`
- Tag `vX.Y.Z` -> Play track `production` (harus lewat approval environment)

Tujuan utamanya:

- Build internal tidak mengganggu production
- Release production hanya terjadi saat benar-benar disengaja (via tag)
- Versi Android aman (versionCode selalu naik)

## 2. Gambaran Workflow

Workflow `Android Release` memiliki 3 job:

1. `plan`
- Menentukan target track (`internal`/`closed`/`production`)
- Menentukan `versionName` dan `versionCode`
- Validasi aturan trigger

2. `validate`
- `flutter pub get`
- `flutter analyze`
- `flutter test test/widget_test.dart`

3. `build-and-deploy`
- Build AAB release
- Validasi `versionCode` terhadap Play Store (harus lebih besar dari versi tertinggi saat ini)
- Upload ke track Play Store sesuai hasil `plan`

## 3. Trigger yang Didukung

### 3.1 Push branch

- `develop` -> deploy ke `internal`
- `main` dan `release/*` -> deploy ke `closed`
- Branch trigger dibatasi path mobile:
  - `apps/mobile/**`
  - `.github/workflows/android-release.yml`

Catatan:
- Kalau tidak ada perubahan file mobile, push branch tidak memicu release workflow mobile.

### 3.2 Push tag production

- Tag format wajib: `vX.Y.Z` (contoh: `v1.2.3`)
- Akan deploy ke `production` dan masuk gate approval environment `mobile-production`

### 3.3 Manual run (`workflow_dispatch`)

- Hanya untuk `internal` atau `closed` (pilih `target_track`)
- Bisa override `version_name` dan `version_code`

## 4. Setup Sekali Oleh Admin Repository

## 4.1 Environment GitHub yang wajib ada

- `mobile-internal`
- `mobile-closed`
- `mobile-production`

## 4.2 Protection rules per environment

### `mobile-internal`
- Required reviewers: OFF
- Deployment branches and tags: `develop`

### `mobile-closed`
- Required reviewers: OFF (boleh ON jika ingin approval untuk closed)
- Deployment branches and tags:
  - `main`
  - `release/*`

### `mobile-production`
- Required reviewers: ON
- Prevent self-review: ON
- Allow administrators to bypass: sebaiknya OFF untuk gate ketat
- Deployment branches and tags:
  - Tag: `v*.*.*`

## 4.3 Secret yang dibutuhkan

Set minimal ini di GitHub (Repository secrets atau Environment secrets sesuai kebijakan):

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `ANDROID_PACKAGE_NAME`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

Opsional:
- `GOOGLE_SERVICES_JSON_BASE64`

## 5. Aturan Versioning

## 5.1 versionName

- Tag production `v1.2.3` -> `1.2.3`
- Push ke `develop` -> `<base-from-pubspec>-dev.<run_number>`
- Push ke `main`/`release/*` -> `<base-from-pubspec>-rc.<run_number>`
- Manual run bisa override dengan input `version_name`

## 5.2 versionCode

- Default: Unix timestamp (detik)
- Bisa override dengan input `version_code`
- Divalidasi:
  - integer
  - > 0
  - <= 2100000000
  - harus lebih besar dari versi tertinggi yang sudah ada di Play Store

## 6. Release Notes (What s New)

Prioritas sumber release notes:

1. `apps/mobile/whatsnew/whatsnew-id-ID` (atau legacy `whatsnew-id`)
2. Anotasi tag git (khusus tag release)
3. Fallback otomatis dari workflow

Untuk English:
- pakai `apps/mobile/whatsnew/whatsnew-en-US` jika ada
- jika tidak ada, fallback default bahasa Inggris

## 7. SOP Harian Developer

## 7.1 Pengembangan harian (internal track)

Gunakan branch `develop` untuk integrasi harian mobile.

```powershell
git checkout develop
git pull origin develop
```

Kerjakan perubahan mobile, lalu validasi lokal:

```powershell
cd apps/mobile
flutter pub get
flutter analyze
flutter test test/widget_test.dart
```

Commit dan push:

```powershell
git add -A
git commit -m "feat(mobile): deskripsi perubahan"
git push origin develop
```

Hasil yang diharapkan:
- Workflow `Android Release` jalan
- Deploy ke Play track `internal`

## 7.2 Kirim kandidat ke closed tester

Saat fitur siap diuji terbatas:

```powershell
git checkout develop
git pull origin develop
git checkout -b release/1.2.0
git push -u origin release/1.2.0
```

Setelah ada perbaikan di branch release:

```powershell
git add -A
git commit -m "fix(mobile): perbaikan kandidat rilis 1.2.0"
git push origin release/1.2.0
```

Hasil yang diharapkan:
- Workflow jalan
- Deploy ke Play track `closed`

Catatan:
- Push ke `main` juga masuk `closed` track.

## 7.3 Rilis production (hanya via tag)

Pastikan commit yang ingin dirilis sudah final (umumnya dari `main`).

Contoh:

```powershell
git checkout main
git pull origin main
git tag -a v1.2.3 -m "Mobile release v1.2.3"
git push origin v1.2.3
```

Hasil yang diharapkan:

1. Workflow `Android Release` berjalan
2. Job deploy menunggu approval environment `mobile-production`
3. Reviewer approve
4. AAB dirilis ke track `production`

## 7.4 Manual run untuk recovery/non-prod

Gunakan `Actions` -> `Android Release` -> `Run workflow` jika perlu:

- Pilih `target_track`: `internal` atau `closed`
- Isi `version_name`/`version_code` jika memang perlu override

Jangan gunakan manual run untuk production.

## 8. Checklist Cepat Sebelum Push

Untuk `develop`/`release/*`/`main`:

- [ ] Perubahan memang menyentuh mobile (`apps/mobile`)
- [ ] `flutter analyze` lulus
- [ ] `flutter test test/widget_test.dart` lulus
- [ ] Tidak ada secret atau file sensitif ikut commit

Tambahan untuk production tag:

- [ ] Tag format `vX.Y.Z`
- [ ] Catatan rilis siap
- [ ] Reviewer production siap approve

## 9. Troubleshooting Umum

### 9.1 "Unsupported branch"

Penyebab:
- Branch bukan `develop`, `main`, atau `release/*`

Solusi:
- Gunakan branch yang sesuai kebijakan pipeline.

### 9.2 versionCode gagal (lebih kecil dari Play)

Penyebab:
- `version_code` override terlalu kecil
- Timestamp bentrok dengan release yang sudah ada

Solusi:
- Jalankan ulang dengan `version_code` lebih besar dari Play latest.

### 9.3 Workflow berhenti di production

Penyebab:
- Menunggu approval environment `mobile-production`

Solusi:
- Reviewer masuk ke halaman run Actions dan approve deployment.

### 9.4 Rule environment "applies to 0 branches"

Penyebab:
- Branch pattern ada, tapi branch belum benar-benar ada di remote

Solusi:
- Buat branch di remote (contoh `develop`) lalu refresh halaman environment.

### 9.5 Missing secrets

Penyebab:
- Secret belum diisi atau nama tidak cocok

Solusi:
- Verifikasi nama secret persis sama dengan yang dipakai workflow.

## 10. Praktik Harian yang Direkomendasikan

- Merge perubahan mobile harian ke `develop`
- Gunakan `release/*` untuk stabilisasi kandidat rilis
- Gunakan tag `vX.Y.Z` hanya saat siap production
- Simpan release notes singkat dan jelas di anotasi tag
- Pantau tab `Actions` setiap selesai push penting

## 11. Contoh Alur End-to-End

1. Developer push fitur ke `develop` -> internal testers validasi
2. Buat `release/1.2.0` -> closed testers validasi
3. Perbaiki bug di `release/1.2.0` sampai lolos
4. Sinkronkan ke `main` sesuai proses tim
5. Buat tag `v1.2.0` -> approve production -> rilis ke Play production

