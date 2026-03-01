# QA Checklist: Verifikasi Alur Mandor sampai Persetujuan Asisten/Manager

Dokumen ini dipakai untuk verifikasi end-to-end alur:
- Input panen oleh `MANDOR`
- Persetujuan atau penolakan oleh `ASISTEN` atau `MANAGER`

Status pengujian yang dipakai:
- `PASS`
- `FAIL`
- `BLOCKED`

## Data Uji

| Item | Nilai |
|---|---|
| Environment |  |
| Build Version |  |
| Tanggal Test |  |
| Tester |  |
| User Mandor |  |
| User Asisten |  |
| User Manager |  |
| Scope Company/Estate/Divisi |  |

## Checklist Eksekusi

| Test ID | Skenario | Precondition | Langkah Uji | Expected Result | Actual Result | Status | Evidence | Catatan |
|---|---|---|---|---|---|---|---|---|
| HARV-001 | Login Mandor | User `MANDOR` aktif | Login sebagai mandor | Login berhasil, masuk dashboard mandor |  |  |  |  |
| HARV-002 | Akses Form Input Panen | Login mandor | Buka menu/form input panen | Form terbuka tanpa error |  |  |  |  |
| HARV-003 | Validasi field wajib kosong | Form input terbuka | Submit tanpa isi field wajib | Submit ditolak, pesan validasi muncul |  |  |  |  |
| HARV-004 | Validasi format nilai | Form input terbuka | Isi nilai invalid, submit | Submit ditolak sesuai aturan |  |  |  |  |
| HARV-005 | Submit panen valid | Data master lengkap | Isi form valid lalu submit | Record tersimpan dengan status `PENDING_APPROVAL`/`SUBMITTED` |  |  |  |  |
| HARV-006 | Lock setelah submit | Record baru submit | Coba edit record oleh mandor | Edit ditolak sesuai policy |  |  |  |  |
| HARV-007 | Visibilitas pending ke Asisten | Ada record pending | Login `ASISTEN`, buka daftar approval | Record terlihat di daftar pending |  |  |  |  |
| HARV-008 | Visibilitas pending ke Manager | Ada record pending | Login `MANAGER`, buka daftar approval | Record terlihat sesuai rule/hirarki |  |  |  |  |
| HARV-009 | Scope akses approver | User beda area/divisi | Login approver non-scope, cek record | Record tidak terlihat/akses ditolak |  |  |  |  |
| HARV-010 | Approve oleh Asisten | Record pending valid | Approve record dari akun asisten | Status jadi `APPROVED` |  |  |  |  |
| HARV-011 | Reject oleh Asisten tanpa alasan | Record pending valid | Reject tanpa alasan | Ditolak, alasan reject wajib |  |  |  |  |
| HARV-012 | Reject oleh Asisten dengan alasan | Record pending valid | Reject dengan alasan | Status jadi `REJECTED`, alasan tersimpan |  |  |  |  |
| HARV-013 | Approve oleh Manager | Record pending valid | Approve record dari akun manager | Status jadi `APPROVED` |  |  |  |  |
| HARV-014 | Cegah double approval | Record sudah approved/rejected | Coba approve ulang dari role lain | Ditolak, tidak ada perubahan status |  |  |  |  |
| HARV-015 | Pending list update | Ada aksi approve/reject | Refresh daftar pending | Record hilang dari pending list |  |  |  |  |
| HARV-016 | Notifikasi ke approver | Mandor submit record | Cek notifikasi asisten/manager | Notifikasi pending masuk |  |  |  |  |
| HARV-017 | Notifikasi balik ke mandor | Record di-approve/reject | Cek notifikasi mandor | Notifikasi hasil approval/reject masuk |  |  |  |  |
| HARV-018 | Audit trail submit | Ada record baru | Lihat detail/audit | `submittedBy` dan `submittedAt` tercatat |  |  |  |  |
| HARV-019 | Audit trail decision | Ada approval/reject | Lihat detail/audit | `approvedBy/rejectedBy`, waktu, alasan tercatat |  |  |  |  |
| HARV-020 | Laporan status | Ada data mixed status | Buka report/filter status | Jumlah status sesuai data aktual |  |  |  |  |
| HARV-021 | Duplikasi input | Coba submit data sama | Submit record identik | Ditolak/ditandai sesuai rule duplikasi |  |  |  |  |
| HARV-022 | Race condition approval | 2 approver buka record sama | Approve hampir bersamaan | Hanya 1 hasil final, tanpa inkonsistensi |  |  |  |  |
| HARV-023 | Resilience jaringan saat submit | Simulasi koneksi putus | Submit saat jaringan fluktuatif | Tidak ada data ganda, retry aman |  |  |  |  |
| HARV-024 | Resilience jaringan saat approve | Simulasi koneksi putus | Approve/reject saat jaringan fluktuatif | Status konsisten, tidak dobel proses |  |  |  |  |

## Ringkasan Hasil

| Item | Nilai |
|---|---|
| Total Test Case | 24 |
| PASS |  |
| FAIL |  |
| BLOCKED |  |
| Defect Tercatat |  |
| Kesimpulan UAT/QA |  |

## Sign-off

| Role | Nama | Tanggal | Tanda Tangan |
|---|---|---|---|
| QA |  |  |  |
| Product Owner |  |  |  |
| Operasional |  |  |  |
