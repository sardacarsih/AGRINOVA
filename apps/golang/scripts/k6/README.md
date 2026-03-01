# Mandor Sync k6 Tests

This folder contains `k6` load tests for the Mandor mobile sync flow against the GraphQL API.

## Covered Flow

The main script is [`mandor-sync-full.js`](./mandor-sync-full.js). It exercises:

1. `mobileLogin`
2. full master sync
   - `myAssignments`
   - `mandorBlocks`
   - `mandorEmployees`
3. incremental master sync
   - `mandorDivisionMastersSync`
   - `mandorBlocksSync`
   - `mandorEmployeesSync`
4. harvest upload
   - `syncHarvestRecords`
5. pull status updates
   - `mandorServerUpdates`

## Important Photo Note

Mandor harvest photos do not use a separate upload endpoint in the sync flow.

Photos are sent as part of `syncHarvestRecords.records[].photoUrl`, so the script tests three write variants:

1. `no_photo`
2. `photo_reference`
3. `photo_inline`

`photo_inline` is the real "photo sync" path because the backend decodes the base64 payload and writes a file on the server.

## Safety

`syncHarvestRecords` is a write path.

By default, the script skips all harvest upload steps unless `ENABLE_WRITE_SYNC=true`.

Use write-path testing only against a staging/test tenant with disposable data.

## Required Environment Variables

Always required:

- `BASE_URL`
- `MANDOR_IDENTIFIER`
- `MANDOR_PASSWORD`
- `DEVICE_ID`
- `DEVICE_FINGERPRINT`

Optional:

- `PLATFORM` (default: `ANDROID`)
- `DIVISION_ID`
- `UPDATED_SINCE` (default: `2025-01-01T00:00:00Z`)
- `STATUS_SINCE` (default: `2025-01-01T00:00:00Z`)
- `K6_SCENARIO` (`smoke`, `load`, `stress`; default: `load`)

Write-path options:

- `ENABLE_WRITE_SYNC`
- `HARVEST_TEMPLATE_JSON`
- `PHOTO_URL_REFERENCE`
- `ENABLE_INLINE_PHOTO_SYNC`
- `PHOTO_DATA_URI`

## HARVEST_TEMPLATE_JSON

When `ENABLE_WRITE_SYNC=true`, `HARVEST_TEMPLATE_JSON` is required.

Minimum required fields:

- `blockId`
- `karyawanId`
- `nik`
- `beratTbs`
- `jumlahJanjang`
- `status`
- `localVersion`
- `lastUpdated`

Recommended example:

```json
{
  "tanggal": "2026-03-01T07:00:00Z",
  "blockId": "11111111-1111-1111-1111-111111111111",
  "karyawanId": "22222222-2222-2222-2222-222222222222",
  "nik": "EMP001",
  "beratTbs": 1250.5,
  "jumlahJanjang": 87,
  "status": "SUBMITTED",
  "localVersion": 1,
  "lastUpdated": "2026-03-01T07:05:00Z",
  "divisionId": "division-a",
  "companyId": "company-a",
  "estateId": "estate-a"
}
```

The script overrides `localId`, `mandorId`, `lastUpdated`, and `batchId` automatically per iteration.

## Photo Modes

### 1. No Photo

No `photoUrl` field is sent.

### 2. Photo Reference

Enabled when `PHOTO_URL_REFERENCE` is set. Example:

```text
/uploads/harvest_photos/sample.jpg
```

### 3. Inline Photo

Enabled only when:

- `ENABLE_WRITE_SYNC=true`
- `ENABLE_INLINE_PHOTO_SYNC=true`
- `PHOTO_DATA_URI` is present

Example:

```text
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...
```

## Scenario Presets

- `smoke`: single quick validation run
- `load`: default baseline load
- `stress`: higher concurrency for bottleneck discovery

## Example Usage

### Read-only Sync Validation

```powershell
$env:BASE_URL="http://localhost:8080/query"
$env:MANDOR_IDENTIFIER="mandor.test"
$env:MANDOR_PASSWORD="secret"
$env:DEVICE_ID="k6-device-01"
$env:DEVICE_FINGERPRINT="k6-fingerprint-01"
$env:K6_SCENARIO="load"
k6 run apps/golang/scripts/k6/mandor-sync-full.js
```

### Full Flow Including Harvest Upload and Inline Photo

```powershell
$env:BASE_URL="http://localhost:8080/query"
$env:MANDOR_IDENTIFIER="mandor.test"
$env:MANDOR_PASSWORD="secret"
$env:DEVICE_ID="k6-device-01"
$env:DEVICE_FINGERPRINT="k6-fingerprint-01"
$env:K6_SCENARIO="load"
$env:ENABLE_WRITE_SYNC="true"
$env:ENABLE_INLINE_PHOTO_SYNC="true"
$env:PHOTO_URL_REFERENCE="/uploads/harvest_photos/sample.jpg"
$env:PHOTO_DATA_URI="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
$env:HARVEST_TEMPLATE_JSON='{\"tanggal\":\"2026-03-01T07:00:00Z\",\"blockId\":\"11111111-1111-1111-1111-111111111111\",\"karyawanId\":\"22222222-2222-2222-2222-222222222222\",\"nik\":\"EMP001\",\"beratTbs\":1250.5,\"jumlahJanjang\":87,\"status\":\"SUBMITTED\",\"localVersion\":1,\"lastUpdated\":\"2026-03-01T07:05:00Z\"}'
k6 run apps/golang/scripts/k6/mandor-sync-full.js
```

## Metrics

The script emits separate `Trend` metrics for:

- login
- full master sync steps
- incremental master sync steps
- harvest upload without photo
- harvest upload with photo reference
- harvest upload with inline photo
- pull server updates

It also emits failure counters for:

- auth failures
- master sync failures
- harvest upload failures
- inline photo failures
- server update failures
- skipped write-path runs

## Recommended Next Steps

1. Run `smoke` first to verify credentials, payload shape, and tenant scope.
2. Enable write-path only after confirming the target environment is safe for test data.
3. Compare `no_photo` versus `photo_inline` latency to isolate base64 and file-write overhead.
