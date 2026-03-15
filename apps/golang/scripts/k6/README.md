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

To match the latest mobile mandor flow, the script skips `mandorServerUpdates` in the
same iteration when at least one harvest upload succeeds and actually pushes fresh
records. Pull status is still exercised when write sync is disabled or when upload
does not send new data.

## Important Photo Note

Mandor harvest photos do not use a separate upload endpoint in the sync flow.

Photos are sent as part of `syncHarvestRecords.records[].photoUrl`, so the script tests three write variants:

1. `no_photo`
2. `photo_reference`
3. `photo_inline`

`photo_inline` is the real "photo sync" path because the backend decodes the base64 payload and writes a file on the server.
To avoid backend duplicate checks on the same worker + block + date, the script automatically offsets `tanggal` per mode and also makes it unique per run, per iteration, and per VU using bounded day windows. The mode baseline is: base date for `no_photo`, `+1 day` for `photo_reference`, and `+2 days` for `photo_inline`. By default, each run gets an automatic day-seed so repeated runs do not reuse the same date window. If your template `tanggal` is too close to year `9999`, the script automatically rebases it to a safe internal year while preserving month/day/time so generated timestamps stay valid RFC3339 values.

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

The script automatically appends `-vu-<number>` to both values so each VU behaves like a separate mobile device during load/stress runs.

Optional:

- `PLATFORM` (default: `ANDROID`)
- `DIVISION_ID`
- `UPDATED_SINCE` (default: `2025-01-01T00:00:00Z`)
- `STATUS_SINCE` (default: `2025-01-01T00:00:00Z`)
- `K6_SCENARIO` (`smoke`, `load`, `stress`, `batch50`, `batch100`, `batch500`, `batch1000`; default: `load`)

Write-path options:

- `ENABLE_WRITE_SYNC`
- `HARVEST_RECORD_COUNT`
- `HARVEST_TEMPLATE_JSON`
- `PHOTO_URL_REFERENCE`
- `ENABLE_INLINE_PHOTO_SYNC`
- `PHOTO_DATA_URI`
- `HARVEST_RUN_DAY_SEED`
- `DEBUG_GRAPHQL_ERRORS`

## HARVEST_TEMPLATE_JSON

When `ENABLE_WRITE_SYNC=true`, `HARVEST_TEMPLATE_JSON` is required.
`HARVEST_RECORD_COUNT` is optional, defaults to `1`, and supports these batch sizes: `1`, `50`, `100`, `500`, `1000`.
If you use `K6_SCENARIO=batch50`, `batch100`, `batch500`, or `batch1000`, the script sets the matching batch size automatically unless you override `HARVEST_RECORD_COUNT`.
`HARVEST_RUN_DAY_SEED` is optional and lets you manually pin the per-run day offset inside the script's safe rerun window if you want deterministic reruns; otherwise the script generates it automatically per run in a non-legacy date window so it avoids colliding with older test data more reliably.
`DEBUG_GRAPHQL_ERRORS=true` is optional and prints the first GraphQL error payload for a request. Use it only for diagnosis because it adds noisy console output under load.

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
  "status": "PENDING",
  "localVersion": 1,
  "lastUpdated": "2026-03-01T07:05:00Z",
  "divisionId": "division-a",
  "companyId": "company-a",
  "estateId": "estate-a"
}
```

The script overrides `localId`, `mandorId`, `lastUpdated`, and `batchId` automatically per iteration.
When `HARVEST_RECORD_COUNT` is greater than `1`, the script clones the template into a batch and generates a unique `tanggal` for each record.

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
- `batch50`: load profile with `HARVEST_RECORD_COUNT=50`
- `batch100`: load profile with `HARVEST_RECORD_COUNT=100`
- `batch500`: reduced-concurrency load profile with `HARVEST_RECORD_COUNT=500`
- `batch1000`: conservative load profile with `HARVEST_RECORD_COUNT=1000`

## Example Usage

### Read-only Sync Validation

```powershell
$env:BASE_URL="http://localhost:8080/graphql"
$env:MANDOR_IDENTIFIER="mandorje"
$env:MANDOR_PASSWORD="demo123"
$env:DEVICE_ID="k6-device-01"
$env:DEVICE_FINGERPRINT="k6-fingerprint-01"
$env:K6_SCENARIO="load"
k6 run apps/golang/scripts/k6/mandor-sync-full.js
```

### Full Flow Including Harvest Upload and Inline Photo

```powershell
$env:BASE_URL="http://localhost:8080/graphql"
$env:MANDOR_IDENTIFIER="mandorje"
$env:MANDOR_PASSWORD="demo123"
$env:DEVICE_ID="k6-device-01"
$env:DEVICE_FINGERPRINT="k6-fingerprint-01"
$env:K6_SCENARIO="load"
$env:ENABLE_WRITE_SYNC="true"
$env:HARVEST_RECORD_COUNT="50"
$env:ENABLE_INLINE_PHOTO_SYNC="true"
$env:PHOTO_URL_REFERENCE="/uploads/harvest_photos/sample.jpg"
$env:PHOTO_DATA_URI="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
$env:HARVEST_TEMPLATE_JSON='{\"tanggal\":\"2026-03-01T07:00:00Z\",\"blockId\":\"0caa8336-41c4-4733-9bf8-559771e83777\",\"karyawanId\":\"41da26e9-7c85-4b76-a389-1ccba397ae2e\",\"nik\":\"00010\",\"beratTbs\":1250.5,\"jumlahJanjang\":87,\"status\":\"PENDING\",\"localVersion\":1,\"lastUpdated\":\"2026-03-01T07:05:00Z\",\"divisionId\":\"14673b53-fbcb-4ed9-aba0-50906226c58b\"}'
k6 run apps/golang/scripts/k6/mandor-sync-full.js
```

### Batch Size Variants

You can use the env var directly:

```powershell
$env:HARVEST_RECORD_COUNT="100"
```

```powershell
$env:HARVEST_RECORD_COUNT="500"
```

```powershell
$env:HARVEST_RECORD_COUNT="1000"
```

Or use the built-in scenario presets and skip `HARVEST_RECORD_COUNT` entirely:

```powershell
$env:K6_SCENARIO="batch50"
```

```powershell
$env:K6_SCENARIO="batch100"
```

```powershell
$env:K6_SCENARIO="batch500"
```

```powershell
$env:K6_SCENARIO="batch1000"
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
