# Mobile App UI Role QA (All `app_ui` Slots)

Dokumen ini untuk uji cepat bahwa payload campaign `assets.mobile.app_ui` diterapkan di dashboard mobile:
- Manager
- Asisten
- Mandor
- Area Manager
- Super Admin
- Company Admin

## 1) Payload contoh campaign update

Gunakan payload ini saat `POST /api/theme-campaigns` atau `PUT /api/theme-campaigns/{campaignId}`.

```json
{
  "campaign_group_key": "mobile-app-ui-smoke",
  "campaign_name": "Mobile App UI Smoke",
  "theme_id": "00000000-0000-0000-0000-000000000102",
  "description": "Smoke test navbar/footer mobile dashboard",
  "enabled": true,
  "priority": 200,
  "start_at": "2026-03-15T00:00:00Z",
  "end_at": "2026-12-31T23:59:59Z",
  "light_mode_enabled": true,
  "dark_mode_enabled": true,
  "assets": {
    "web": {
      "backgroundImage": "",
      "illustration": "",
      "iconPack": "outline-enterprise",
      "accentAsset": "none"
    },
    "mobile": {
      "backgroundImage": "",
      "illustration": "",
      "iconPack": "outline-enterprise",
      "accentAsset": "none",
      "app_ui": {
        "navbar": {
          "backgroundColor": "#0F172A",
          "foregroundColor": "#FFFFFF",
          "iconColor": "#A7F3D0"
        },
        "sidebar": {
          "backgroundColor": "#0B1220",
          "foregroundColor": "#E2E8F0",
          "iconColor": "#93C5FD",
          "borderColor": "#1E293B"
        },
        "footer": {
          "backgroundColor": "#111827",
          "foregroundColor": "#9CA3AF",
          "accentColor": "#34D399",
          "borderColor": "#1F2937"
        },
        "dashboard": {
          "backgroundColor": "#F8FAFC",
          "foregroundColor": "#FFFFFF",
          "textColor": "#0F172A",
          "borderColor": "#E2E8F0",
          "accentColor": "#2563EB"
        },
        "notification_banner": {
          "backgroundColor": "#0B1220",
          "textColor": "#F8FAFC"
        },
        "empty_state_illustration": {
          "asset": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=640&q=80"
        },
        "modal_accent": {
          "backgroundColor": "#FFFFFF",
          "accentColor": "#14532D"
        }
      }
    }
  }
}
```

## 2) Verifikasi runtime payload

Pastikan response runtime mobile memuat slot:

`GET /api/theme-campaigns/runtime-theme?platform=mobile&mode=light`

Checklist:
- `source` = `ACTIVE_CAMPAIGN`
- `app_ui.navbar.backgroundColor` = `#0F172A`
- `app_ui.navbar.foregroundColor` = `#FFFFFF`
- `app_ui.navbar.iconColor` = `#A7F3D0`
- `app_ui.footer.backgroundColor` = `#111827`
- `app_ui.footer.foregroundColor` = `#9CA3AF`
- `app_ui.footer.accentColor` = `#34D399`
- `app_ui.footer.borderColor` = `#1F2937`
- `app_ui.sidebar.backgroundColor` = `#0B1220`
- `app_ui.sidebar.foregroundColor` = `#E2E8F0`
- `app_ui.sidebar.iconColor` = `#93C5FD`
- `app_ui.sidebar.borderColor` = `#1E293B`
- `app_ui.dashboard.backgroundColor` = `#F8FAFC`
- `app_ui.dashboard.foregroundColor` = `#FFFFFF`
- `app_ui.dashboard.textColor` = `#0F172A`
- `app_ui.dashboard.borderColor` = `#E2E8F0`
- `app_ui.dashboard.accentColor` = `#2563EB`
- `app_ui.notification_banner.backgroundColor` = `#0B1220`
- `app_ui.notification_banner.textColor` = `#F8FAFC`
- `app_ui.empty_state_illustration.asset` terisi URL valid
- `app_ui.modal_accent.backgroundColor` = `#FFFFFF`
- `app_ui.modal_accent.accentColor` = `#14532D`

## 3) QA UI per role (mobile app)

Login dengan akun tiap role lalu buka dashboard utama.

Checklist Manager:
- AppBar background = `#0F172A`
- Judul/icon AppBar = `#FFFFFF`/`#A7F3D0`
- Bottom nav background = `#111827`
- Item aktif bottom nav = `#34D399`
- Item non-aktif bottom nav = `#9CA3AF`
- Warna popup menu mengikuti slot `sidebar`
- Background dashboard mengikuti `app_ui.dashboard.backgroundColor`
- Snackbar notifikasi mengikuti `app_ui.notification_banner`
- Dialog approval/reject mengikuti `app_ui.modal_accent`
- Empty state (monitor/notification) menampilkan `empty_state_illustration` jika URL valid

Checklist Asisten:
- AppBar background = `#0F172A`
- Judul/icon AppBar = `#FFFFFF`/`#A7F3D0`
- Bottom nav background = `#111827`
- Item aktif bottom nav = `#34D399`
- Item non-aktif bottom nav = `#9CA3AF`
- Warna popup menu mengikuti slot `sidebar`
- Background dashboard mengikuti `app_ui.dashboard.backgroundColor`
- Snackbar notifikasi mengikuti `app_ui.notification_banner`
- Dialog approval/reject mengikuti `app_ui.modal_accent`
- Empty state notification menampilkan `empty_state_illustration` jika URL valid

Checklist Mandor:
- AppBar background = `#0F172A`
- Judul/icon AppBar = `#FFFFFF`/`#A7F3D0`
- Bottom nav background = `#111827`
- Item aktif bottom nav = `#34D399`
- Item non-aktif bottom nav = `#9CA3AF`
- Warna popup menu mengikuti slot `sidebar`
- Background dashboard mengikuti `app_ui.dashboard.backgroundColor`
- Snackbar (input/riwayat/sinkronisasi) mengikuti `app_ui.notification_banner`
- Dialog izin kamera/edit/hapus mengikuti `app_ui.modal_accent`
- Empty state riwayat/notifikasi menampilkan `empty_state_illustration` jika URL valid

Checklist Area Manager / Super Admin / Company Admin:
- AppBar mengikuti slot `navbar`
- Area dashboard/cards mengikuti slot `dashboard` (background/surface/accent/text/border)
- Menu/sheet/filter mengikuti slot `sidebar` + `modal_accent`
- Snackbar notifikasi mengikuti slot `notification_banner`
