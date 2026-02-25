# Panduan Harian Android Release (GitHub Actions + Play Console)

Dokumen ini sinkron dengan workflow aktif:

- `.github/workflows/android-release.yml`

## 1. Kebijakan Rilis Saat Ini

- `develop` -> build AAB baru -> upload ke Play track `internal`.
- `main` -> **promote artifact existing** dari `develop` -> upload ke Play track `alpha` (closed testing).
- `workflow_dispatch`:
  - `target_track=internal` -> build baru ke `internal`.
  - `target_track=closed` -> promote ke `alpha` dari artifact internal.

Catatan penting:

- Rilis production via tag saat ini **dinonaktifkan** di workflow.
- Track `closed` tidak build ulang binary; harus memakai artifact internal.

## 2. Aturan Versi

### 2.1 Internal (build baru)

- `versionName`: `<base-from-pubspec>-dev.<github_run_number>`
- `versionCode`: default Unix timestamp (detik), bisa di-override via input workflow.

### 2.2 Closed/Alpha (promote)

- `versionName` dan `versionCode` diambil dari metadata artifact internal sumber.
- Karena binary dipromosikan, versi alpha bisa tertinggal dari internal sampai ada promote terbaru.

## 3. Aturan Source Commit untuk Closed/Alpha

Untuk promote `closed`:

- `source_commit` wajib diisi (workflow_dispatch).
- `source_commit` harus sama dengan **latest successful develop internal artifact**.
- Jika tidak sama, job promotion akan gagal dengan pesan commit yang seharusnya.

Tujuan aturan ini:

- Mencegah promote artifact lama.
- Menjaga alpha selalu merefleksikan kandidat internal terbaru yang lolos.

## 4. Trigger yang Didukung

### 4.1 Push branch

- Push ke `develop` (dengan perubahan `apps/mobile/**`) -> rilis `internal`.
- Push ke `main` (dengan perubahan `apps/mobile/**`) -> flow promote ke `alpha`.

### 4.2 Manual (`workflow_dispatch`)

Input:

- `target_track`: `internal` atau `closed`
- `version_name`, `version_code`: optional (hanya relevan saat build baru/internal)
- `source_commit`: wajib untuk `closed`

### 4.3 Yang tidak didukung

- Push tag production (`vX.Y.Z`) saat ini ditolak oleh workflow.

## 5. SOP Operasional Harian

### 5.1 Rilis internal dari develop

```powershell
git checkout develop
git pull origin develop
# lakukan perubahan mobile
git add -A
git commit -m "feat(mobile): ..."
git push origin develop
```

Expected:

- Workflow `Android Release` sukses.
- Play Console internal menampilkan versi baru.

### 5.2 Promote ke alpha (closed)

1. Buka run internal terbaru yang sukses di GitHub Actions.
2. Salin `head_sha` commit develop run tersebut.
3. Jalankan `workflow_dispatch`:
   - `target_track=closed`
   - `source_commit=<sha_internal_terbaru>`

Expected:

- Job `promote-to-alpha` sukses.
- Alpha memakai binary yang sama dengan internal commit tersebut.

## 6. Checklist Sebelum Promote Alpha

- Internal terbaru sudah lulus QA.
- `source_commit` yang dipakai = commit internal terbaru.
- Artifact internal belum expired (retention 30 hari).

## 7. Troubleshooting Cepat

### 7.1 Error: source_commit must match latest successful develop internal artifact commit

Penyebab:

- Anda memakai SHA lama.

Solusi:

- Ambil SHA dari run internal sukses paling baru, lalu rerun dispatch.

### 7.2 Error: Artifact ... not found / expired

Penyebab:

- Artifact internal sudah tidak tersedia.

Solusi:

- Trigger build internal baru dari `develop`, lalu promote lagi.

### 7.3 versionCode gagal (lebih kecil dari Play max)

Penyebab:

- Override `version_code` terlalu kecil.

Solusi:

- Kosongkan override agar pakai timestamp baru, atau isi angka yang lebih tinggi.

## 8. Catatan What's New

Workflow otomatis menghasilkan file `whatsnew-id-ID` dan `whatsnew-en-US` saat build internal.
Saat promote alpha, notes ikut dari artifact internal.

Jika perlu teks khusus, ubah proses build internal sumbernya terlebih dahulu.
