# Mandor Sync Manual Checklist

## Scope
- Role: `MANDOR` (mobile)
- Related role for approval: `ASISTEN`
- Features: upload panen sync, approval pull sync, retry failed sync

## Preconditions
- Backend running at `http://localhost:8080/graphql` (or environment endpoint)
- Test users available:
  - Mandor: `mandor / demo123`
  - Asisten: `asisten / demo123`
- Mandor has assigned blocks and employees
- Mobile app installed with latest build

## Test 1: Create Panen -> Sync Upload
1. Login as Mandor.
2. Open harvest input and create one `PENDING` record with photo (optional).
3. Open `Sinkronisasi Data` page.
4. Tap `Upload Panen`.
5. Verify expected result:
   - UI shows success message.
   - Local record marked synced.
   - Server receives record (`syncHarvestRecords.recordsSuccessful > 0`).

## Test 2: Approval Pull Sync
1. Using Asisten account, approve the same harvest record.
2. Return to Mandor app.
3. Tap `Update Status Approval`.
4. Verify expected result:
   - Record status changes from `PENDING` to `APPROVED` in Mandor history.
   - Approval metadata populated (`approvedBy`, `approvedAt`).

## Test 3: Rejection Pull Sync
1. Create another Mandor harvest record and sync upload.
2. As Asisten, reject the record with reason.
3. Mandor taps `Update Status Approval`.
4. Verify expected result:
   - Status changes to `REJECTED`.
   - Rejection reason appears in Mandor record detail.

## Test 4: Retry Failed Sync
1. Disable network on device.
2. Create or edit a `PENDING` harvest record.
3. Trigger sync and verify it fails.
4. Re-enable network.
5. Trigger sync again.
6. Verify expected result:
   - Failed item retries successfully.
   - Failed count decreases to zero.

## Test 5: Multi-account Isolation (same device)
1. Login as Mandor A, run sync.
2. Logout, login as Mandor B, run sync.
3. Verify expected result:
   - Sync counters/timestamps are isolated per Mandor account.
   - No cross-account failed/retry leakage.

## Regression Checks
- No duplicate record created when same `localId` is re-sent.
- Approved/rejected records cannot be edited from Mandor flow.
- Sync page messages match operation result (no false success).
- Photo payload sync still works (if photo included).
