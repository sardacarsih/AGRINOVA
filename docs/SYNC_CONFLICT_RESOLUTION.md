# Sync Conflict Resolution Strategy

## Overview

Agrinova uses an **offline-first architecture** where the Flutter mobile app stores data locally in SQLite and synchronizes with the Go GraphQL backend when connectivity is available. Conflicts arise when the same record is modified on both client and server between sync cycles.

The system uses a **dual-layer conflict resolution** approach:
1. **Server-side (Go)**: Server-authoritative timestamp comparison during harvest sync
2. **Mobile-side (Flutter)**: Field-level conflict detection, auto-resolution with confidence scoring, and manual resolution queue

---

## Server-Side Strategy

**Location**: `apps/golang/internal/graphql/resolvers/mandor_harvest_sync.go` — `checkAndResolveConflict()`

### Algorithm: Server-Authoritative Last-Write-Wins

```
Input: existing server record, incoming client sync input

1. If client provides no lastUpdated timestamp → no conflict detection, allow sync
2. Compare server.UpdatedAt vs client.LastUpdated
3. If server.UpdatedAt > client.LastUpdated → CONFLICT (server wins)
4. Otherwise → no conflict, proceed with client update
```

### Behavior on Conflict

- The server **does not apply the client's changes**
- The existing server record is returned as-is in the sync response
- The client receives the server version and is expected to update its local copy
- Conflict is logged to stdout for audit: `[Conflict Detected] LocalID=... Server wins`

### Sync Flow (`SyncHarvestRecords` mutation)

For each record in the sync batch:

1. **Validate** `karyawanID` (must be UUID) and `nik` (must not be empty)
2. **Determine operation** — UPDATE if `serverID` is present and record exists, otherwise CREATE
3. **For UPDATE path**:
   - Verify mandor ownership (access denied if different mandor)
   - Run conflict check (timestamp comparison)
   - If conflict → skip update, return server version
   - If no conflict → check status allows update (PENDING, or REJECTED→PENDING correction)
   - Apply update via `updateHarvestRecordFromSync()`
4. **For CREATE path**:
   - Check idempotency via `localID` lookup
   - If record exists by `localID` → return existing (idempotent)
   - Otherwise create new record
5. **Post-batch**: Send notification to asisten (single or batch)

### Correction Flow

When a mandor edits a **rejected** harvest record and resubmits:
- The status transitions from REJECTED back to PENDING
- `rejectedReason`, `approvedAt`, `approvedBy` are cleared
- Record re-enters the asisten approval queue

---

## Mobile-Side Strategy

### Sync Phases

**Location**: `apps/mobile/lib/core/services/graphql_sync_service.dart`

The sync engine runs 6 sequential phases:

| Phase | Description |
|-------|-------------|
| 1 | Upload guest logs (gate check) |
| 2 | Upload employee logs |
| 3 | Sync QR tokens |
| 4 | Upload photos (batch) |
| 5 | **Resolve conflicts** |
| 6 | Pull server updates |

### Conflict Resolution Service

**Location**: `apps/mobile/lib/core/services/enhanced_conflict_resolution_service.dart`

#### Detection

The service performs **field-level conflict analysis**:
- Compares local and server values for each field
- Assigns priority scores per field (e.g., `id: 100`, `status: 75`, `notes: 30`)
- Classifies conflict type and calculates auto-resolution confidence

#### Auto-Resolution

Confidence thresholds per table:

| Table | Threshold | Rationale |
|-------|-----------|-----------|
| `harvest_records` | 0.9 | High accuracy required for financial data |
| `gate_guest_logs` | 0.8 | Important for security audit trail |
| `gate_check_records` | 0.7 | Medium-high for gate operations |
| `notifications` | 0.6 | Lower priority, can be regenerated |

When auto-resolution confidence exceeds the threshold:
1. Start with local data as base
2. Apply field-level merge using per-field strategies
3. For gate guest logs: apply cross-device QR merge logic
4. Store resolution in `sync_conflicts_enhanced` SQLite table
5. Submit resolved data to server via GraphQL mutation

#### Manual Resolution

When auto-resolution confidence is below threshold, the conflict enters a manual queue. Available strategies:
- **CLIENT_WINS**: Use local data entirely
- **SERVER_WINS**: Use server data entirely
- **MERGE**: Automatic merge of non-conflicting fields
- **CUSTOM**: User provides field-level choices (`LOCAL`, `SERVER`, or `CUSTOM` per field)

#### Conflict Storage

Conflicts are persisted in `sync_conflicts_enhanced` SQLite table with:
- `conflict_id`, `table_name`, `record_id`
- `local_data`, `server_data` (JSON)
- `conflicting_fields`, `field_analysis` (JSON)
- `status`: PENDING → AUTO_RESOLVED | MANUALLY_RESOLVED
- `resolution_strategy`, `resolution_data`, `resolution_source`
- `resolved_at`, `resolved_by`

---

## Data Flow

```
Mobile App (offline edits)
    |
    | SyncHarvestRecords mutation (batch)
    | sends: localID, serverID, lastUpdated, field values
    v
Go GraphQL Backend
    |
    |-- For each record:
    |   |-- Has serverID? → UPDATE path
    |   |   |-- checkAndResolveConflict()
    |   |   |   server.UpdatedAt > client.LastUpdated? → CONFLICT
    |   |   |   |-- Yes: return server record (server wins)
    |   |   |   |-- No: apply client updates
    |   |-- No serverID? → CREATE path (idempotent by localID)
    |
    | Response: MandorSyncResult
    |   - per-record: serverID, success, status (ACCEPTED/REJECTED)
    |   - summary: conflictsDetected count
    v
Mobile App
    |-- Update local SQLite with server responses
    |-- If conflict detected: server version overwrites local
    |-- Phase 5: resolve any remaining conflicts in local queue
    |-- Phase 6: pull latest server updates (approval status changes)
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Client sends no `lastUpdated` | No conflict detection; sync proceeds normally |
| Client offline for extended period | Server may have multiple updates; first sync after reconnect may show many conflicts |
| Simultaneous edits by mandor on two devices | Second device's sync will hit conflict if first device synced first; server version wins |
| Record approved/rejected while mandor editing | Server status change wins; mandor receives updated status in sync response |
| Network failure mid-sync | Transaction per-record; completed records are committed, remaining retry on next sync |
| Duplicate CREATE (same localID) | Idempotent — returns existing record without creating duplicate |
| REJECTED record re-submitted | Correction flow: status resets to PENDING, enters approval queue again |

---

## Design Decisions

1. **Server-authoritative for harvest data**: Financial/agricultural data integrity is critical. Server state is the source of truth for approval workflows.

2. **Field-level resolution on mobile only**: The server uses simple timestamp comparison for speed. The mobile app has the richer conflict resolution because it needs to handle diverse data types (gate logs, QR tokens, photos) that may require merge strategies.

3. **No version vectors**: The system uses simple timestamp comparison rather than vector clocks. This is sufficient because each harvest record has a single owner (mandor) and conflicts only arise from approval workflow changes (asisten/manager) vs. mandor edits.

4. **Idempotent creates**: Using `localID` as a natural deduplication key prevents duplicate records even if the mobile app retries a failed sync.
