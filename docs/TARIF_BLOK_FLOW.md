# Tarif Blok Flow (Non-Dev Friendly)

Dokumen ini menjelaskan cara kerja fitur `Tarif Blok` dari sisi bisnis dan teknis secara ringkas.

## 1) Gambaran Sederhana

`Tarif Blok` adalah aturan tarif kerja panen per company.  
Aturan ini dipilih di level blok (`Block`) dan bisa punya override konteks:

- `NORMAL` (default)
- `HOLIDAY` (hari libur)
- `LEBARAN` (periode Lebaran)

## 2) Relasi Data (ERD Ringkas)

```mermaid
erDiagram
    COMPANIES ||--o{ TARIFF_SCHEMES : has
    LAND_TYPES ||--o{ TARIFF_SCHEMES : categorizes
    TARIFF_SCHEMES ||--o{ TARIFF_SCHEME_RULES : contains
    TARIFF_SCHEME_RULES ||--o{ TARIFF_RULE_OVERRIDES : has
    TARIFF_SCHEME_RULES ||--o{ BLOCKS : assigned_to

    COMPANIES {
      uuid id PK
      string name
    }
    LAND_TYPES {
      uuid id PK
      string code
      string name
    }
    TARIFF_SCHEMES {
      uuid id PK
      uuid company_id FK
      uuid land_type_id FK
      string scheme_code
    }
    TARIFF_SCHEME_RULES {
      uuid id PK
      uuid scheme_id FK
      string tarif_code
      string perlakuan
      float tarif_upah
      float premi
      bool is_active
    }
    TARIFF_RULE_OVERRIDES {
      uuid id PK
      uuid rule_id FK
      string override_type
      date effective_from
      date effective_to
      float tarif_upah
      float premi
      bool is_active
    }
    BLOCKS {
      uuid id PK
      uuid tarif_blok_id FK
      string block_code
      string name
    }
```

Catatan:
- `tarif_blok` saat ini dipertahankan sebagai compatibility view untuk API/UI lama.
- Data sumber utamanya sudah dinormalisasi ke 3 tabel: `tariff_schemes`, `tariff_scheme_rules`, `tariff_rule_overrides`.

## 3) Alur Bisnis Utama

```mermaid
flowchart TD
    A[User buka menu Tarif Blok] --> B[Load tarifBloks + overrides sesuai company scope user]
    B --> C{Aksi user}
    C -->|Create / Update Rule| D[Simpan rule tarif]
    D --> E[Sync projection: scheme + rule + default override]
    E --> F[Normal override dibuat ulang otomatis]
    C -->|Create Override| G[Simpan override HOLIDAY / LEBARAN / NORMAL]
    G --> H[Validasi bentrok periode per rule + type]
    C -->|Assign ke Block| I[Validasi company & land type harus cocok]
    C -->|Delete Rule| J{Masih dipakai block?}
    J -->|Ya| K[Tolak delete]
    J -->|Tidak| L[Delete rule + cleanup projection]
```

## 4) Aturan Penting yang Perlu Diingat

1. Scope data mengikuti company assignment di profil user.
2. Rule tarif tidak boleh bentrok kode unik dalam scope yang sama (per company + skema/land type).
3. `NORMAL` biasanya selalu ada karena dibuat otomatis saat save rule tarif.
4. Override periode aktif untuk kombinasi `rule + override_type` tidak boleh overlap.
5. Rule tarif tidak bisa dihapus jika masih dipakai oleh block.
6. Block hanya boleh memakai tarif dari company yang sama dan land type yang kompatibel.

## 5) Contoh Praktis

1. Admin Company A membuat rule:
- `Tarif Code`: `BJR20`
- `Scheme`: `KATEGORI_BJR`
- `Tarif Upah`: `120000`

2. Sistem otomatis membentuk:
- 1 row `tariff_scheme_rules`
- 1 row override `NORMAL` (tanpa periode)

3. Admin menambah override `HOLIDAY` periode 2026-12-24 s/d 2026-12-31:
- nilai `tarif_upah` naik, misal `140000`

4. Jika ada override `HOLIDAY` lain dengan periode overlap untuk rule yang sama:
- sistem menolak (conflict).

## 6) Ringkasan untuk Tim Operasional

- Rule dasar tarif dikelola di `Tarif Blok`.
- Kenaikan musiman/libur dikelola via `Override`.
- Seluruh data tetap aman per company scope.
- Perubahan rule langsung disinkronkan ke model tarif baru di backend.
