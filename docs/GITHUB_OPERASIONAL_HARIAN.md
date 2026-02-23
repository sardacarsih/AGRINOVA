# GitHub Operasional Harian (Mode Solo)

Dokumen ini disesuaikan dengan kondisi kamu saat ini: kerja sendiri (`single developer`), repo lokal adalah tempat kerja utama, GitHub dipakai sebagai backup dan automation (`CI` + artifact build).

## 1) Istilah Dasar
- `Repo`: folder project yang tersimpan di GitHub.
- `Branch`: jalur kerja terpisah (contoh: `main`, `feat/login-fix`).
- `Commit`: snapshot perubahan file.
- `Push`: kirim commit dari laptop ke GitHub.
- `Pull`: ambil update terbaru dari GitHub.
- `GitHub Actions`: proses otomatis (test/build/artifact).

## 2) Alur Kerja Harian (Paling Praktis untuk Solo)
1. Mulai dari `main` lokal.
2. Sinkronkan dulu dengan remote (`fetch` + `pull`).
3. Kerjakan perubahan (boleh langsung di `main` untuk perubahan kecil).
4. Jalankan validasi minimal.
5. Commit.
6. Push ke `origin/main`.
7. Pantau `Actions` sampai selesai.

## 3) Perintah Wajib Harian (PowerShell)
### Mulai kerja
```powershell
git checkout main
git fetch origin
git pull origin main
```

### Cek kondisi kerja lokal
```powershell
git status
git diff
```

### Validasi minimal
```powershell
npm --prefix apps/web run type-check
go test ./apps/golang/...
```

### Simpan perubahan
```powershell
git add -A
git commit -m "feat: deskripsi singkat"
```

### Kirim ke GitHub
```powershell
git push origin main
```

## 3.1) Penjelasan Detail Setiap Perintah
### A. Sinkronisasi awal
`git checkout main`
- Fungsi: pindah ke branch `main` lokal.
- Kapan dipakai: sebelum mulai kerja harian.
- Kenapa penting: supaya kamu tidak kerja di branch lama/tidak sengaja.

`git fetch origin`
- Fungsi: mengambil metadata dan commit terbaru dari remote (`origin`) tanpa mengubah file kerja lokal.
- Kapan dipakai: setelah `checkout main`, sebelum `pull`.
- Kenapa penting: aman untuk cek apakah remote lebih baru.

`git pull origin main`
- Fungsi: mengambil commit terbaru dari `origin/main` lalu menggabungkannya ke `main` lokal.
- Kapan dipakai: awal kerja dan saat lokal tertinggal.
- Kenapa penting: mencegah konflik saat push.

### B. Pemeriksaan perubahan
`git status`
- Fungsi: menampilkan kondisi branch, file berubah, dan status sinkronisasi dengan remote.
- Kapan dipakai: sesering mungkin saat kerja.
- Kenapa penting: memberi konteks sebelum `add`, `commit`, atau `push`.

`git diff`
- Fungsi: menampilkan isi perubahan baris per baris yang belum di-commit.
- Kapan dipakai: sebelum `git add -A`.
- Kenapa penting: memastikan perubahan sudah sesuai ekspektasi.

### C. Validasi kode
`npm --prefix apps/web run type-check`
- Fungsi: menjalankan TypeScript type-check untuk aplikasi web.
- Kapan dipakai: sebelum commit/push jika ada perubahan frontend.
- Kenapa penting: menangkap error tipe data sebelum masuk ke CI.

`go test ./apps/golang/...`
- Fungsi: menjalankan seluruh unit/integration test Go di `apps/golang` (rekursif).
- Kapan dipakai: sebelum commit/push jika ada perubahan backend.
- Kenapa penting: mencegah regresi di backend.

### D. Menyimpan snapshot perubahan
`git add -A`
- Fungsi: menandai semua perubahan (file baru, ubah, hapus) untuk commit berikutnya.
- Kapan dipakai: setelah cek `status` dan `diff`.
- Kenapa penting: memastikan tidak ada file penting yang tertinggal.

`git commit -m "feat: deskripsi singkat"`
- Fungsi: membuat snapshot permanen perubahan di repo lokal.
- Kapan dipakai: setelah semua file yang benar sudah di-stage.
- Kenapa penting: commit adalah titik aman untuk rollback/jejak perubahan.

### E. Mengirim perubahan ke GitHub
`git push origin main`
- Fungsi: mengirim commit lokal di branch `main` ke `origin/main`.
- Kapan dipakai: setelah commit selesai dan validasi lulus.
- Kenapa penting: GitHub jadi backup + memicu automation (`CI` dan build artifact).

### F. Saat push ditolak
`git pull --rebase origin main`
- Fungsi: menarik update remote dan menempatkan commit lokal kamu di atas update terbaru remote.
- Kapan dipakai: jika `push` gagal dengan `non-fast-forward`.
- Kenapa penting: riwayat commit tetap rapi dan konflik lebih mudah diurai.

`git push origin main` (ulang)
- Fungsi: mengirim ulang setelah rebase berhasil.
- Kapan dipakai: tepat setelah `pull --rebase`.
- Kenapa penting: finalisasi sinkronisasi lokal ke remote.

### G. Batalkan perubahan file tertentu
`git restore path/ke/file`
- Fungsi: mengembalikan satu file ke kondisi commit terakhir (membuang perubahan lokal file tersebut).
- Kapan dipakai: saat ada edit yang salah dan belum ingin di-commit.
- Kenapa penting: membersihkan perubahan tanpa menyentuh file lain.

## 4) Checklist "Lokal Sudah Paling Update"
Jalankan:
```powershell
git checkout main
git fetch origin
git status
```

Interpretasi:
- `up to date with 'origin/main'`: lokal dan GitHub sinkron.
- `ahead of 'origin/main' by N commits`: lokal lebih baru, belum di-push.
- `behind 'origin/main' by N commits`: GitHub lebih baru, lakukan `git pull origin main`.

## 5) Cara Baca GitHub Actions
- Kuning: sedang berjalan.
- Hijau: sukses.
- Merah: gagal.

Workflow di repo ini:
- `CI`: validasi build/test.
- `Backend Release`: build backend production release via tag `backend/vX.Y.Z` (atau manual).
- `Web Release`: build web production release via tag `web/vX.Y.Z` (atau manual).

## 6) Error Umum dan Solusi Cepat
### A) Push ditolak (`non-fast-forward`)
Artinya remote lebih baru.
```powershell
git pull --rebase origin main
git push origin main
```

### B) Ada file ketinggalan setelah commit
```powershell
git add -A
git commit -m "fix: tambah file yang ketinggalan"
git push origin main
```

### C) Mau batalkan perubahan file sebelum commit
```powershell
git restore path/ke/file
```

## 7) Operasional Release Backend/Web
Release backend (otomatis via tag):
```powershell
git tag -a backend/v1.2.3 -m "Backend release v1.2.3"
git push origin backend/v1.2.3
```

Release web (otomatis via tag):
```powershell
git tag -a web/v1.2.3 -m "Web release v1.2.3"
git push origin web/v1.2.3
```

Manual run:
- Buka tab `Actions` di GitHub.
- Pilih `Backend Release` atau `Web Release`.
- Klik `Run workflow`, isi `version`, lalu jalankan.

## 8) Kapan Tetap Pakai Branch Fitur
Pakai branch (`feat/...`) jika:
- Perubahan besar atau banyak file.
- Lagi eksperimen yang belum pasti.
- Mau rollback lebih mudah.

Alur singkat:
```powershell
git checkout main
git pull origin main
git checkout -b feat/nama-perubahan
git add -A
git commit -m "feat: ..."
git push origin feat/nama-perubahan
```

Penjelasan cepat:
- `git checkout -b feat/nama-perubahan`: membuat branch baru dari posisi commit saat ini lalu langsung pindah ke branch itu.
- `git push origin feat/nama-perubahan`: mengirim branch fitur ke GitHub (biasanya untuk PR atau backup eksperimen).

## 9) Template Pesan Commit
- `feat: tambah filter regional dashboard`
- `fix: perbaiki query analytics area manager`
- `ci: update trigger build artifact`
- `chore: rapikan dokumentasi setup`

## 10) Referensi Khusus Mobile Release
- Untuk SOP lengkap pipeline mobile (branch -> track, environment, approval production, versioning, dan troubleshooting), lihat:
  - `docs/MOBILE_GITHUB_ACTIONS_DAILY_GUIDE.md`
- Untuk template cara memberi perintah ke AI (prompt siap pakai), lihat:
  - `docs/MOBILE_GITHUB_ACTIONS_DAILY_GUIDE.md` bagian `12. Template Command ke AI (Operasional Harian)`
