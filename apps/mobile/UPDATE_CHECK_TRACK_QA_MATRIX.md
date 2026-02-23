# Update Check Track QA Matrix

Dokumen ini untuk verifikasi logic update Agrinova Mobile agar konsisten di:
- Internal testing (`-dev.*`)
- Closed testing (`-rc.*`)
- Production (`x.y.z`)

## Prasyarat

- Build app dengan versionName sesuai channel:
  - Internal: contoh `1.1.8-dev.123`
  - Closed: contoh `1.1.8-rc.123`
  - Production: contoh `1.1.8`
- Build number (`versionCode`) valid integer dan sudah terpasang di device.
- Device online.
- Logcat aktif untuk verifikasi log `AppUpdateService`.

## Matrix Test

| ID | Installed App | Simulasi Sumber Update | Hasil yang Diharapkan |
|---|---|---|---|
| TC-01 | Internal `1.1.8-dev.123` build `1771851552` | Play Store `updateAvailable`, `availableVersionCode=1771851552` | Tidak muncul banner update (karena build sama) |
| TC-02 | Internal `1.1.8-dev.123` build `1771851550` | Play Store `updateAvailable`, `availableVersionCode=1771851552` | Muncul banner update |
| TC-03 | Internal `1.1.8-dev.123` | Server kirim `latestVersion=1.1.8` (production), build lebih tinggi, tanpa Play Store update | Tidak muncul banner (channel mismatch) |
| TC-04 | Closed `1.1.8-rc.123` | Server kirim `latestVersion=1.1.8-dev.999`, build lebih tinggi | Tidak muncul banner (channel mismatch) |
| TC-05 | Production `1.1.8` | Server kirim `latestVersion=1.1.9-rc.10`, build lebih tinggi | Tidak muncul banner (channel mismatch) |
| TC-06 | Internal/Closed/Production | Server kirim channel beda, tapi `metadata.releaseScope=all`, build lebih tinggi | Muncul banner update (override all-channel) |
| TC-07 | Any channel | Play Store status `developerTriggeredUpdateInProgress`, `availableVersionCode <= installed` | Tidak muncul banner |
| TC-08 | Any channel | Play Store status update tersedia, tapi `availableVersionCode=null` | Tidak muncul banner (hindari false-positive) |
| TC-09 | Production `1.1.8` build lama | Play Store `availableVersionCode` lebih tinggi | Muncul banner update |
| TC-10 | Any channel | Tidak ada update Play Store dan server build/version tidak lebih tinggi | Tidak muncul banner |

## Expected Log Indicators

- Saat false positive dicegah:
  - `Play Store reported update state without availableVersionCode; skipping update prompt`
  - `Ignoring Play Store update signal because available build (...) <= installed build (...)`
- Saat server beda channel diabaikan:
  - `Ignoring server update ... because channel is not compatible with installed version ...`

## Verifikasi Label Channel

- Internal: `versionName` mengandung `-dev.`
- Closed: `versionName` mengandung `-rc.`
- Production: `versionName` tanpa `-dev.`/`-rc.`

## Kriteria Lulus

- Tidak ada banner update palsu setelah fresh install dari Play Store pada build yang sama.
- Update tetap terdeteksi benar saat build Play Store memang lebih tinggi.
- Tidak ada cross-channel prompt yang menyesatkan (internal vs closed vs production), kecuali `releaseScope=all`.
