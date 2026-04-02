# Asisten Role — Mobile App Flow & Process

## Role Overview

**Asisten** is the direct supervisor of Mandor (field foreman). Primary responsibility: **approve or reject harvest records** submitted by Mandors, and monitor division-level harvest performance.

| Attribute | Value |
|-----------|-------|
| Role level | 4 (same as Satpam) |
| Reports to | Manager |
| Manages | Mandor(s) in assigned division(s) |
| Offline duration | 14 days |
| Rate limit | 150 req/window |
| Web access | Yes |
| Mobile access | Yes |

### Permissions

```
harvest_approval, view_division_stats, monitoring_division, realtime_notifications
```

---

## Mobile App Flow

### Entry & Routing

```
App Launch → AuthBloc → JWT validation → Role = ASISTEN
  → AppRoutes.getDashboardRoute() returns "/asisten"
  → RouteGuard checks "harvest_approval" permission
  → Loads AsistenPage
```

**Key files:**
- `apps/mobile/lib/core/routes/app_routes.dart` — route `/asisten`
- `apps/mobile/lib/core/routes/route_guards.dart` — permission check
- `apps/mobile/lib/features/dashboard/presentation/pages/asisten_page.dart` — main page (1084 lines)

### Navigation (4 Tabs)

| Tab | Component | Purpose |
|-----|-----------|---------|
| 0 - Dashboard | Built-in `AsistenPage` | Stats grid, quick actions, pending approvals (top 3) |
| 1 - Approval | `ApprovalView` + `ApprovalBloc` | Full approval list with PENDING/APPROVED/REJECTED filter tabs |
| 2 - Monitoring | `AsistenMonitoringTab` + `MonitoringBloc` | Division performance charts, mandor tracking |
| 3 - Profile | `AsistenProfileTab` | User info, settings, logout |

---

## Approval Workflow (Core Feature)

### Happy Path

```
Mandor submits harvest (SyncHarvestRecords mutation)
  → Server creates record (status: PENDING)
  → FCM push notification → Asisten's device
  → Auto-refresh ApprovalBloc via FCM listener
  → Asisten sees new item in Pending tab
```

### Approve

```
Asisten taps Approve
  → ApprovalBloc.add(ApprovalApproveRequested(id, notes))
  → GraphQL: mutation ApproveHarvest($id: ID!, $notes: String)
  → Backend validates:
      1. requireAsistenUserID(ctx) — JWT user ID
      2. ensureAsistenCanAccessHarvest(ctx, userID, id) — scope check
      3. PanenResolver.ApproveHarvestRecord(ctx, input) — status update
  → Status: PENDING → APPROVED
  → Sets approved_by = asisten user ID, approved_at = now
  → Notifications:
      - FCM push to Mandor (NotifyMandorApproved)
      - In-app notification to Mandor (NotifyHarvestApproved)
      - WebSocket event: publishHarvestRecordApproved
```

### Reject

```
Asisten taps Reject (reason required)
  → ApprovalBloc.add(ApprovalRejectRequested(id, reason))
  → GraphQL: mutation RejectHarvest($id: ID!, $reason: String!)
  → Same validation as approve
  → Status: PENDING → REJECTED, stores rejection reason
  → Notifications to Mandor with rejection reason
  → Mandor can correct & resubmit (REJECTED → PENDING correction flow)
```

### Correction Flow

When Mandor edits a rejected harvest record and resubmits:
1. Mobile sends sync with `status: "PENDING"` for a record with existing `serverID`
2. Backend detects `existingStatus == "REJECTED" && requestedStatus == "PENDING"`
3. Status resets to PENDING, clears `rejectedReason`, `approvedAt`, `approvedBy`
4. Record re-enters Asisten's approval queue

---

## Data Scoping

```go
// asisten.resolvers.go:1166
func applyAsistenScopeToHarvestQuery(query, asistenUserID):
  JOIN users AS mandors ON mandors.id = harvest_records.mandor_id
  WHERE mandors.manager_id = {asistenUserID}
    AND mandors.is_active = true
    AND mandors.deleted_at IS NULL
```

Asisten sees **only** harvest records from active Mandors who report directly to them (via `manager_id` foreign key).

---

## Dashboard (Tab 0)

### Stats Grid

**Query:** `asistenDashboardStats`
- Pending Approvals count
- Approved Today count
- Rejected Today count
- Total TBS Pending, Active Mandors (calculated client-side)

### Quick Actions

6-button grid: Approval, Batch, Quality, Monitoring, Reports, History

### Pending Section

Displays top 3 pending items with mandor name, block, weight, and elapsed time.

---

## Monitoring (Tab 2)

**Query:** `asistenMonitoring`

| Data | Description |
|------|-------------|
| `realtimeStats.totalSubmissionsToday` | Number of harvest submissions today |
| `realtimeStats.totalTbsToday` | Total TBS count today |
| `realtimeStats.totalWeightToday` | Total weight (kg) today |
| `divisionSummaries[].divisionName` | Division name |
| `divisionSummaries[].progress` | Completion progress (0-1) |
| `mandorStatuses[].mandorName` | Mandor name |
| `mandorStatuses[].todayWeight` | Weight submitted today |
| `mandorStatuses[].todaySubmissions` | Submission count today |
| `mandorStatuses[].approvedSubmissions` | Approved count today |

Period selector: Today / This Week / This Month

---

## GraphQL Operations

### Queries (mobile uses)

| Query | Mobile File | Backend Resolver |
|-------|-------------|------------------|
| `pendingApprovals(filter)` | approval_repository.dart:34 | asisten.resolvers.go:482 |
| `approvalHistory(filter)` | approval_repository.dart:69 | asisten.resolvers.go:598 |
| `harvestRecord(id)` | approval_repository.dart:103 | mandor.resolvers.go |
| `asistenDashboardStats` | approval_repository.dart:330 | asisten.resolvers.go:307 |
| `asistenMonitoring` | monitoring_repository.dart:5 | asisten.resolvers.go:741 |

### Mutations (mobile uses)

| Mutation | Mobile File | Backend Resolver |
|----------|-------------|------------------|
| `approveHarvest(id, notes)` | approval_repository.dart:366 | asisten.resolvers.go:24 |
| `rejectHarvest(id, reason!)` | approval_repository.dart:396 | asisten.resolvers.go:68 |

### Backend-only (NOT used by mobile)

| Operation | Type | Status |
|-----------|------|--------|
| `asistenDashboard` | Query | Mobile builds dashboard from stats+pending instead |
| `asistenTodaySummary` | Query | Available but unused |
| `approvalItem(id)` | Query | Mobile uses `harvestRecord(id)` instead |
| `approvalStats(dateFrom, dateTo)` | Query | Mobile uses `asistenDashboardStats` (today only) |
| `batchApproval(input)` | Mutation | **Backend ready, mobile not implemented** |
| `requestCorrection(id, corrections)` | Mutation | **Backend ready, mobile not implemented** |
| `divisionMonitoring(divisionId)` | Query | Available but unused |
| `blockActivities(divisionId)` | Query | Available but unused |
| `mandorStatuses(divisionId)` | Query | Data comes via `asistenMonitoring` aggregate |
| `activityTimeline(divisionId, limit, since)` | Query | Available but unused |
| `newHarvestSubmission` | Subscription | **Stub (panic), mobile uses FCM** |
| `asistenMonitoringUpdate` | Subscription | **Stub (panic), not implemented** |

---

## Notification Flow

```
Mandor creates harvest
  → notifyAsistenHarvestCreated()
    → FCM: NotifyAsistenNewHarvest (push)
    → In-app: NotifyHarvestCreated (priority: HIGH, type: HARVEST_APPROVAL_NEEDED)
    → Recipients: Asisten (direct supervisor) + Manager (Asisten's supervisor)

Asisten approves
  → notifyMandorHarvestApproved()
    → FCM push to Mandor
    → In-app: NotifyHarvestApproved

Asisten rejects
  → notifyMandorHarvestRejected()
    → FCM push to Mandor (includes rejection reason)
    → In-app: NotifyHarvestRejected
```

---

## UI Component Structure (Atomic Design)

```
asisten_dashboard/
├── asisten_theme.dart              # Blue palette (#2563EB), status colors
├── atoms/
│   ├── asisten_icon_badge.dart     # Notification badge with count
│   ├── asisten_status_badge.dart   # PENDING/APPROVED/REJECTED indicator
│   └── asisten_stat_indicator.dart # Single metric display
├── molecules/
│   ├── asisten_action_button.dart  # Quick action button with icon
│   ├── asisten_approval_item.dart  # Approval list row
│   └── asisten_metric_card.dart    # Stats card with label + value
└── organisms/
    ├── asisten_welcome_section.dart     # Header with user greeting
    ├── asisten_stats_grid.dart          # 2x2 daily metrics grid
    ├── asisten_actions_grid.dart        # 3x2 quick action buttons
    ├── asisten_pending_section.dart     # Top 3 pending approvals
    ├── asisten_bottom_nav.dart          # 4-tab bottom navigation
    ├── asisten_monitoring_tab.dart      # Monitoring dashboard
    ├── asisten_profile_tab.dart         # Profile & settings page
    └── asisten_notification_page.dart   # Notification history list
```

---

## State Management

### ApprovalBloc

**File:** `apps/mobile/lib/features/approval/presentation/blocs/approval_bloc.dart`

| Event | Description |
|-------|-------------|
| `ApprovalLoadRequested(status, divisionId, search)` | Load approvals with filters |
| `ApprovalRefreshRequested` | Refresh current filter |
| `ApprovalApproveRequested(id, notes)` | Approve a harvest |
| `ApprovalRejectRequested(id, reason)` | Reject a harvest |

| State | Description |
|-------|-------------|
| `ApprovalInitial` | Initial state |
| `ApprovalLoading` | Fetching data |
| `ApprovalLoaded(approvals, stats, activeFilterStatus)` | Data ready |
| `ApprovalError(message)` | Error occurred |
| `ApprovalActionSuccess(message)` | Approve/reject succeeded |
| `ApprovalActionFailure(message)` | Approve/reject failed |

Features: SharedPreferences cache fallback, FCM auto-refresh listener, status filter persistence.

### MonitoringBloc

**File:** `apps/mobile/lib/features/monitoring/presentation/blocs/monitoring_bloc.dart`

| Event | Description |
|-------|-------------|
| `MonitoringDataRequested(period, date, showLoader)` | Fetch monitoring data for period |

| State | Description |
|-------|-------------|
| `MonitoringInitial` | Initial |
| `MonitoringLoading` | Fetching |
| `MonitoringLoaded(data)` | Data ready |
| `MonitoringError(message)` | Error |

---

## Identified Gaps

### Functional Gaps

| # | Gap | Severity | Detail |
|---|-----|----------|--------|
| G1 | Batch approval not implemented | MEDIUM | Quick action button exists in UI but taps do nothing. Backend `batchApproval` mutation is ready and tested. |
| G2 | Request correction not exposed | LOW | Backend mutation `requestCorrection` exists but mobile has no UI. Currently uses reject-with-reason as workaround. |
| G3 | WebSocket subscriptions unused | LOW | `newHarvestSubmission` and `asistenMonitoringUpdate` defined in schema but mobile relies on FCM polling. Works but adds ~1-3s latency. |
| G4 | Activity timeline not displayed | LOW | Backend `activityTimeline` query available but monitoring tab doesn't use it. |
| G5 | Division drill-down missing | LOW | `divisionMonitoring(divisionId)` ready but mobile shows only aggregate view. |
| G6 | Date-range stats unavailable | LOW | `approvalStats(dateFrom, dateTo)` supports ranges but mobile only shows today. |

### Potential Issues

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| I1 | No offline approval | MEDIUM | Approve/reject requires network. No offline queue — Asisten in field must wait for connectivity. |
| I2 | Scope via manager_id only | LOW | If Mandor is reassigned to different Asisten, historical records become invisible to old Asisten. |
| I3 | Subscription stubs panic | LOW | `NewHarvestSubmission` and `AsistenMonitoringUpdate` resolvers are `panic("not implemented")`. |

---

## Web Dashboard (Reference)

The web dashboard for Asisten is at `/dashboard/asisten` with:
- `AsistenDashboard` component (1159 lines) with pending queue, approve/reject actions
- Polls `harvestRecordsByStatus` every 30s (PENDING) / 60s (APPROVED, REJECTED)
- Real-time subscriptions: `HARVEST_RECORD_CREATED`, `HARVEST_RECORD_APPROVED`, `HARVEST_RECORD_REJECTED`
- Rejection reasons: DATA_TIDAK_SESUAI, KUALITAS_TIDAK_VALID, LOKASI_TIDAK_VALID, FOTO_TIDAK_JELAS, PERLU_VERIFIKASI_ULANG
- Layout: `AsistenDashboardLayout` with sidebar navigation

**Key web files:**
- `apps/web/features/asisten-dashboard/components/AsistenDashboard.tsx`
- `apps/web/components/layouts/role-layouts/AsistenDashboardLayout.tsx`
- `apps/web/features/approvals/components/ApprovalsDashboard.tsx`
