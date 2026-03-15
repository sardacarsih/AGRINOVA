# Block Treatment Workflow Rollout Checklist

## 1) Permission Matrix

| Role | Allowed Action |
| --- | --- |
| `MANAGER` | Create draft, submit own request, cancel own request |
| `AREA_MANAGER` | Review submitted request, approve/reject request, apply approved request |
| `COMPANY_ADMIN` | Apply approved request |
| `SUPER_ADMIN` | Apply approved request |

Validation guardrails:
- Submit allowed only from `DRAFT` or `REJECTED`.
- Review allowed only from `SUBMITTED`.
- Approve/reject allowed only from `UNDER_REVIEW`.
- Apply allowed only from `APPROVED`.
- Cancel allowed only from `DRAFT` or `SUBMITTED`.

## 2) SOP Operasional Semester

1. Manager membuat draft pengajuan per `semester` (`YYYY-S1` atau `YYYY-S2`).
2. Manager melengkapi item blok + tarif usulan, lalu `submit`.
3. Area Manager memproses `review`.
4. Area Manager `approve` atau `reject` dengan alasan.
5. Jika `reject`, manager revisi dan submit ulang.
6. Jika `approve`, role berwenang menjalankan `apply`.
7. Audit trail diperiksa melalui:
   - `block_treatment_request_status_logs`
   - `tariff_management_decisions`

## 3) Pre-Production Checklist

1. Jalankan migration sampai `000065`.
2. Verifikasi tabel:
   - `block_treatment_change_requests`
   - `block_treatment_change_request_items`
   - `block_treatment_request_status_logs`
   - `tariff_management_decisions`
3. Uji E2E minimal 1 skenario sukses + 1 skenario reject/revisi.
4. Verifikasi semua actor berada pada scope company yang benar.

## 4) Monitoring 2 Siklus Awal

Pantau metrik harian:
- Jumlah request per status.
- Waktu rata-rata dari `SUBMITTED` ke `APPROVED`.
- Waktu rata-rata dari `APPROVED` ke `APPLIED`.
- Jumlah reject + alasan utama reject.
- Jumlah error mutation workflow.

Titik log penting:
- Error transisi status.
- Error conflict blok aktif pada semester yang sama.
- Error apply mass update ke tabel `blocks`.
