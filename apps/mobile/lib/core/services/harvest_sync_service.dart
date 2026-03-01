import 'dart:io';
import 'dart:convert';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:logger/logger.dart';
import '../graphql/graphql_client.dart';
import '../graphql/auth_service.dart';
import '../graphql/harvest_sync_queries.dart';
import '../database/enhanced_database_service.dart';
import '../database/uuid_blob_codec.dart';
import 'unified_secure_storage_service.dart';
import '../utils/sync_error_message_helper.dart';
import 'device_service.dart';

class PullServerUpdatesResult {
  final int totalReceived;
  final int appliedCount;
  final int missingLocalCount;
  final int failedCount;
  final DateTime previousCursor;
  final DateTime nextCursor;

  const PullServerUpdatesResult({
    required this.totalReceived,
    required this.appliedCount,
    required this.missingLocalCount,
    required this.failedCount,
    required this.previousCursor,
    required this.nextCursor,
  });

  int get skippedCount => missingLocalCount + failedCount;
  bool get hasUnsafeRecords => skippedCount > 0;
  bool get cursorAdvanced => nextCursor.isAfter(previousCursor);
}

enum _ServerUpdateApplyStatus { applied, missingLocal, invalidPayload, failed }

class _ServerUpdateApplyResult {
  final _ServerUpdateApplyStatus status;
  final String message;

  const _ServerUpdateApplyResult({required this.status, required this.message});

  bool get safeForCursor => status == _ServerUpdateApplyStatus.applied;
}

class HarvestSyncService {
  final AgroGraphQLClient _graphqlClient;
  final EnhancedDatabaseService _databaseService;
  final Logger _logger = Logger();
  static const String _reloginMessage =
      'Sesi berakhir. Silakan login ulang untuk melanjutkan sinkronisasi.';

  HarvestSyncService({
    required AgroGraphQLClient graphqlClient,
    required EnhancedDatabaseService databaseService,
  }) : _graphqlClient = graphqlClient,
       _databaseService = databaseService;

  Future<String?> _getCurrentMandorIdForSync() async {
    final userId = await UnifiedSecureStorageService.getCurrentUserId();
    final trimmed = userId?.trim() ?? '';
    return trimmed.isEmpty ? null : trimmed;
  }

  /// Main entry point to trigger full bi-directional sync
  /// 1. Push local changes to server (CREATE/UPDATE)
  /// 2. Pull server updates (approval status changes)
  Future<void> syncNow() async {
    _logger.i('Starting Harvest (Mandor) Bi-directional Sync...');

    try {
      final hasValidAuth = await _ensureAuthWithTier();
      if (!hasValidAuth) {
        throw Exception(_reloginMessage);
      }

      // Step 1: Push local changes to server
      await _pushLocalChanges();

      // Step 2: Pull server updates (approval status)
      await pullServerUpdates();

      _logger.i('Bi-directional sync completed successfully');
    } catch (e, st) {
      _logger.e('Harvest Sync Critical Error: $e');
      final userMessage = SyncErrorMessageHelper.toUserMessage(
        e,
        action: 'sinkronisasi data panen',
      );
      Error.throwWithStackTrace(Exception(userMessage), st);
    }
  }

  /// Push local unsynced harvest records to server
  Future<void> _pushLocalChanges() async {
    _logger.i('Pushing local harvest changes to server...');

    // 1. Get unsynced harvests from harvest_records table
    final unsynced = await _getUnsyncedHarvestsLocally();
    if (unsynced.isEmpty) {
      _logger.i('No harvest records to push.');
      return;
    }

    _logger.i('Found ${unsynced.length} unsynced harvest records.');

    // 2. Get device ID from DeviceService
    final deviceId = await DeviceService.getDeviceId();

    // 3. Prepare payload records (per-record protection so one bad row doesn't block the batch)
    final recordsWithEmployees = <Map<String, dynamic>>[];
    for (final localRecord in unsynced) {
      final localId =
          localRecord['harvest_id']?.toString() ??
          localRecord['id']?.toString() ??
          '';
      try {
        final mapped = await _mapToSyncRecordWithEmployees(localRecord);
        recordsWithEmployees.add(mapped);
      } catch (e, st) {
        final issueMessage = 'Gagal menyiapkan payload sync: $e';
        _logger.w('Skipping harvest payload $localId due to mapping error: $e');
        _logger.d(st.toString());
        if (localId.isNotEmpty) {
          await _markSyncFailed(localId, issueMessage);
        }
      }
    }

    final validRecords = <Map<String, dynamic>>[];
    for (final record in recordsWithEmployees) {
      final issues = _validateSyncRecord(record);
      if (issues.isEmpty) {
        validRecords.add(record);
        continue;
      }

      final localId = record['localId']?.toString() ?? '';
      final issueMessage = 'Invalid sync payload: ${issues.join(', ')}';
      _logger.w('Skipping invalid harvest payload $localId: $issueMessage');
      if (localId.isNotEmpty) {
        await _markSyncFailed(localId, issueMessage);
      }
    }

    if (validRecords.isEmpty) {
      _logger.w('No valid harvest payloads to push after local validation.');
      return;
    }

    final serverRecords = validRecords.map(_toServerSyncRecord).toList();

    final input = {
      'deviceId': deviceId,
      'clientTimestamp': DateTime.now().toIso8601String(),
      'records': serverRecords,
    };
    _logger.d(
      'Harvest sync payload preview: ${_buildSyncPayloadPreview(input)}',
    );

    // 4. Execute Mutation
    final MutationOptions options = MutationOptions(
      document: gql(HarvestSyncQueries.syncHarvestRecords),
      variables: {'input': input},
      fetchPolicy: FetchPolicy.noCache,
    );

    final result = await _graphqlClient.mutate(options);

    if (result.hasException) {
      _logger.e('Harvest Push GraphQL Error: ${result.exception}');
      throw result.exception!;
    }

    final data = result.data?['syncHarvestRecords'];
    if (data != null) {
      _logger.i('Harvest Push Response: ${data['message']}');

      // 5. Process per-record results for accurate status tracking
      final results = data['results'] as List<dynamic>?;
      if (results != null) {
        await _processPerRecordResults(results, unsynced);
      } else if (data['success'] == true) {
        // Fallback: mark all as synced if no per-record results
        await _markAsSynced(
          unsynced
              .where(
                (row) => validRecords.any(
                  (record) => record['localId'] == row['harvest_id'],
                ),
              )
              .toList(),
        );
      }

      // Log summary
      final successCount = data['recordsSuccessful'] ?? 0;
      final failedCount = data['recordsFailed'] ?? 0;
      _logger.i(
        'Push completed: $successCount successful, $failedCount failed',
      );
    } else {
      _logger.w('Harvest Push returned null data');
    }
  }

  /// Pull server updates (approval status changes) for MANDOR's harvest records
  /// This fetches records that have been APPROVED or REJECTED by ASISTEN
  Future<void> pullServerUpdates() async {
    await pullServerUpdatesWithResult();
  }

  /// Pull server updates and return detailed counters for UI/reporting.
  Future<PullServerUpdatesResult> pullServerUpdatesWithResult() async {
    _logger.i('Pulling server updates for harvest records...');

    try {
      final hasValidAuth = await _ensureAuthWithTier();
      if (!hasValidAuth) {
        throw Exception(_reloginMessage);
      }

      final currentMandorId = await _getCurrentMandorIdForSync();
      if (currentMandorId == null) {
        throw Exception('Sesi mandor tidak ditemukan');
      }

      // 1. Get last sync timestamp from local storage
      final lastSyncAt = await _getLastPullSyncTimestamp(currentMandorId);
      final deviceId = await DeviceService.getDeviceId();

      _logger.d('Pulling updates since: $lastSyncAt');

      // 2. Execute Query
      final QueryOptions options = QueryOptions(
        document: gql(HarvestSyncQueries.pullServerUpdates),
        variables: {
          'since': lastSyncAt.toIso8601String(),
          'deviceId': deviceId,
        },
        fetchPolicy: FetchPolicy.noCache,
      );

      final result = await _graphqlClient.query(options);

      if (result.hasException) {
        _logger.e('Pull Server Updates Error: ${result.exception}');
        throw result.exception!;
      }

      final data = result.data?['mandorServerUpdates'] as List<dynamic>?;
      if (data == null || data.isEmpty) {
        _logger.i('No server updates to pull.');
        final nextCursor = DateTime.now();
        await _updateLastPullSyncTimestamp(currentMandorId, nextCursor);
        return PullServerUpdatesResult(
          totalReceived: 0,
          appliedCount: 0,
          missingLocalCount: 0,
          failedCount: 0,
          previousCursor: lastSyncAt,
          nextCursor: nextCursor,
        );
      }

      _logger.i('Found ${data.length} server updates to apply.');

      // 3. Apply server updates to local database
      int appliedCount = 0;
      int missingLocalCount = 0;
      int failedCount = 0;
      DateTime maxSafeCursor = lastSyncAt;
      DateTime? earliestUnsafeUpdatedAt;

      for (final serverRecord in data) {
        final typedRecord = Map<String, dynamic>.from(serverRecord as Map);
        final updatedAt = _extractServerUpdatedAt(typedRecord);
        final outcome = await _applyServerUpdate(typedRecord, currentMandorId);
        if (outcome.safeForCursor) {
          appliedCount++;
          if (updatedAt != null && updatedAt.isAfter(maxSafeCursor)) {
            maxSafeCursor = updatedAt;
          }
          continue;
        }

        if (outcome.status == _ServerUpdateApplyStatus.missingLocal) {
          missingLocalCount++;
        } else {
          failedCount++;
        }

        if (updatedAt != null) {
          if (earliestUnsafeUpdatedAt == null ||
              updatedAt.isBefore(earliestUnsafeUpdatedAt)) {
            earliestUnsafeUpdatedAt = updatedAt;
          }
        }
      }

      // 4. Update last sync timestamp with a safe cursor strategy:
      // keep unsafe records in the pull window so they are retried.
      final nextCursor = _resolveNextPullCursor(
        previousCursor: lastSyncAt,
        maxSafeCursor: maxSafeCursor,
        earliestUnsafeUpdatedAt: earliestUnsafeUpdatedAt,
      );
      await _updateLastPullSyncTimestamp(currentMandorId, nextCursor);

      _logger.i(
        'Pull sync completed: $appliedCount applied, '
        '${missingLocalCount + failedCount} skipped '
        '(missingLocal=$missingLocalCount, failed=$failedCount), '
        'cursor=${lastSyncAt.toIso8601String()} -> ${nextCursor.toIso8601String()}',
      );
      return PullServerUpdatesResult(
        totalReceived: data.length,
        appliedCount: appliedCount,
        missingLocalCount: missingLocalCount,
        failedCount: failedCount,
        previousCursor: lastSyncAt,
        nextCursor: nextCursor,
      );
    } catch (e) {
      _logger.e('Pull Server Updates Error: $e');
      throw Exception(
        SyncErrorMessageHelper.toUserMessage(
          e,
          action: 'pengambilan update status panen',
        ),
      );
    }
  }

  Future<bool> _ensureAuthWithTier() async {
    final accessToken = await UnifiedSecureStorageService.getAccessToken();
    final hasAccessToken = accessToken != null && accessToken.trim().isNotEmpty;
    if (hasAccessToken) {
      final accessNeedsRefresh =
          await UnifiedSecureStorageService.needsTokenRefresh();
      if (!accessNeedsRefresh) {
        return true;
      }
      _logger.i(
        'Harvest sync auth: access token expired/near expiry, trying refresh tiers...',
      );
    }

    final authGql = GraphQLAuthService(_graphqlClient.client);
    final deviceInfo = await DeviceService.getDeviceInfo();

    final refreshToken = await UnifiedSecureStorageService.getRefreshToken();
    final hasRefreshToken =
        refreshToken != null && refreshToken.trim().isNotEmpty;
    if (hasRefreshToken) {
      try {
        final payload = await authGql.refreshToken(
          refreshToken: refreshToken,
          deviceId: deviceInfo.deviceId,
          deviceFingerprint: deviceInfo.fingerprint,
        );
        await UnifiedSecureStorageService.storeAuthResponse(payload);
        await _graphqlClient.updateAuthToken(payload.accessToken);
        _logger.i('Harvest sync auth: refreshToken succeeded');
        return true;
      } catch (e) {
        _logger.w('Harvest sync auth: refreshToken failed: $e');
      }
    }

    final offlineToken = await UnifiedSecureStorageService.getOfflineToken();
    final hasOfflineToken =
        offlineToken != null && offlineToken.trim().isNotEmpty;
    if (hasOfflineToken) {
      try {
        final payload = await authGql.deviceRenew(
          offlineToken: offlineToken,
          deviceId: deviceInfo.deviceId,
          deviceFingerprint: deviceInfo.fingerprint,
        );
        await UnifiedSecureStorageService.storeAuthResponse(payload);
        await _graphqlClient.updateAuthToken(payload.accessToken);
        _logger.i('Harvest sync auth: deviceRenew succeeded');
        return true;
      } catch (e) {
        _logger.w('Harvest sync auth: deviceRenew failed: $e');
      }
    }

    _logger.w('Harvest sync auth: all auth tiers exhausted');
    return false;
  }

  /// Apply a single server update to local database
  /// Returns classification used for cursor safety.
  Future<_ServerUpdateApplyResult> _applyServerUpdate(
    Map<String, dynamic> serverRecord,
    String currentMandorId,
  ) async {
    final serverId = serverRecord['id']?.toString().trim() ?? '';
    final localId = serverRecord['localId']?.toString().trim() ?? '';
    final status = serverRecord['status']?.toString().trim() ?? '';
    final approvedBy = serverRecord['approvedBy']?.toString();
    final approvedAt = serverRecord['approvedAt'];
    final rejectedReason = serverRecord['rejectedReason']?.toString();

    if (status.isEmpty) {
      return const _ServerUpdateApplyResult(
        status: _ServerUpdateApplyStatus.invalidPayload,
        message: 'missing status',
      );
    }

    final whereParts = <String>[];
    final whereArgs = <dynamic>[currentMandorId];
    if (serverId.isNotEmpty) {
      whereParts.add('server_id = ?');
      whereArgs.add(serverId);
    }
    if (localId.isNotEmpty) {
      whereParts.add('harvest_id = ?');
      whereArgs.add(localId);
    }

    if (whereParts.isEmpty) {
      return const _ServerUpdateApplyResult(
        status: _ServerUpdateApplyStatus.invalidPayload,
        message: 'missing server id and local id',
      );
    }

    // Find local record by server_id or fallback localId.
    final localRecords = await _databaseService.query(
      'harvest_records',
      where: 'mandor_id = ? AND (${whereParts.join(' OR ')})',
      whereArgs: whereArgs,
      limit: 1,
    );

    if (localRecords.isEmpty) {
      return _ServerUpdateApplyResult(
        status: _ServerUpdateApplyStatus.missingLocal,
        message:
            'No local record found for server_id=$serverId localId=$localId',
      );
    }

    final updates = <String, dynamic>{
      'status': status,
      'sync_status': 'SYNCED',
      'needs_sync': 0,
      'updated_at': DateTime.now().millisecondsSinceEpoch,
    };

    // Keep approval/rejection metadata consistent with latest server status.
    if (status == 'REJECTED') {
      updates['approved_by_id'] = null;
      updates['approval_date'] = null;
      updates['rejection_reason'] =
          (rejectedReason != null && rejectedReason.isNotEmpty)
          ? rejectedReason
          : null;
    } else if (status == 'APPROVED' ||
        status == 'PKS_RECEIVED' ||
        status == 'PKS_WEIGHED') {
      updates['rejection_reason'] = null;
      if (approvedBy != null && approvedBy.isNotEmpty) {
        updates['approved_by_id'] = approvedBy;
      }

      if (approvedAt != null) {
        try {
          final approvedAtDate = DateTime.parse(approvedAt.toString());
          updates['approval_date'] = approvedAtDate.millisecondsSinceEpoch;
        } catch (_) {}
      }
    } else {
      if (approvedBy != null && approvedBy.isNotEmpty) {
        updates['approved_by_id'] = approvedBy;
      }

      if (approvedAt != null) {
        try {
          final approvedAtDate = DateTime.parse(approvedAt.toString());
          updates['approval_date'] = approvedAtDate.millisecondsSinceEpoch;
        } catch (_) {}
      }

      if (rejectedReason != null && rejectedReason.isNotEmpty) {
        updates['rejection_reason'] = rejectedReason;
      }
    }

    try {
      await _databaseService.update(
        'harvest_records',
        updates,
        where: 'mandor_id = ? AND (${whereParts.join(' OR ')})',
        whereArgs: whereArgs,
      );
    } catch (e) {
      return _ServerUpdateApplyResult(
        status: _ServerUpdateApplyStatus.failed,
        message: e.toString(),
      );
    }

    _logger.d(
      'Applied server update server_id=$serverId localId=$localId status=$status',
    );
    return const _ServerUpdateApplyResult(
      status: _ServerUpdateApplyStatus.applied,
      message: 'applied',
    );
  }

  DateTime? _extractServerUpdatedAt(Map<String, dynamic> serverRecord) {
    final candidates = [
      serverRecord['updatedAt'],
      serverRecord['approvedAt'],
      serverRecord['createdAt'],
    ];
    for (final raw in candidates) {
      if (raw == null) continue;
      final parsed = DateTime.tryParse(raw.toString());
      if (parsed != null) return parsed;
    }
    return null;
  }

  DateTime _resolveNextPullCursor({
    required DateTime previousCursor,
    required DateTime maxSafeCursor,
    required DateTime? earliestUnsafeUpdatedAt,
  }) {
    if (earliestUnsafeUpdatedAt == null) {
      if (maxSafeCursor.isAfter(previousCursor)) {
        return maxSafeCursor;
      }
      return DateTime.now();
    }

    final candidate = earliestUnsafeUpdatedAt.subtract(
      const Duration(milliseconds: 1),
    );
    if (candidate.isAfter(previousCursor)) {
      return candidate;
    }
    return previousCursor;
  }

  /// Get the last pull sync timestamp from local storage
  String _buildHarvestPullSyncKey(String mandorId) {
    return 'harvest_last_pull_sync:$mandorId';
  }

  Future<DateTime> _getLastPullSyncTimestamp(String mandorId) async {
    try {
      final scopedKey = _buildHarvestPullSyncKey(mandorId);

      final results = await _databaseService.query(
        'sync_metadata',
        where: 'key = ?',
        whereArgs: [scopedKey],
        limit: 1,
      );

      if (results.isNotEmpty && results.first['value'] != null) {
        final timestampStr = results.first['value'].toString();
        return DateTime.parse(timestampStr);
      }

      // Backward compatibility for older builds that stored one global key.
      final legacy = await _databaseService.query(
        'sync_metadata',
        where: "key = 'harvest_last_pull_sync'",
        limit: 1,
      );
      if (legacy.isNotEmpty && legacy.first['value'] != null) {
        final timestampStr = legacy.first['value'].toString();
        return DateTime.parse(timestampStr);
      }
    } catch (e) {
      _logger.w('Error getting last pull sync timestamp: $e');
    }

    // Default: 24 hours ago for first sync
    return DateTime.now().subtract(const Duration(hours: 24));
  }

  /// Update the last pull sync timestamp in local storage
  Future<void> _updateLastPullSyncTimestamp(
    String mandorId,
    DateTime timestamp,
  ) async {
    try {
      final scopedKey = _buildHarvestPullSyncKey(mandorId);

      // Try to update existing record
      final updated = await _databaseService.update(
        'sync_metadata',
        {
          'value': timestamp.toIso8601String(),
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        },
        where: 'key = ?',
        whereArgs: [scopedKey],
      );

      // If no record existed, insert new one
      if (updated == 0) {
        await _databaseService.insert('sync_metadata', {
          'key': scopedKey,
          'value': timestamp.toIso8601String(),
          'created_at': DateTime.now().millisecondsSinceEpoch,
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        });
      }
    } catch (e) {
      _logger.w('Error updating last pull sync timestamp: $e');
      // Non-critical error, don't throw
    }
  }

  Future<List<Map<String, dynamic>>> _getUnsyncedHarvestsLocally() async {
    final currentUserId = await UnifiedSecureStorageService.getCurrentUserId();
    if (currentUserId == null || currentUserId.trim().isEmpty) {
      _logger.w(
        'Cannot sync harvest records: current mandor session not found',
      );
      return [];
    }

    // Query harvest_records where sync_status is PENDING or needs_sync = 1
    return await _databaseService.query(
      'harvest_records',
      where: "(sync_status = 'PENDING' OR needs_sync = 1) AND mandor_id = ?",
      whereArgs: [currentUserId.trim()],
    );
  }

  /// Map local harvest record to sync format using canonical IDs from local DB.
  Future<Map<String, dynamic>> _mapToSyncRecordWithEmployees(
    Map<String, dynamic> local,
  ) async {
    // Convert harvest_date from INTEGER (milliseconds) to ISO8601 string
    String? tanggal;
    if (local['harvest_date'] != null) {
      final ts = local['harvest_date'];
      if (ts is int) {
        tanggal = DateTime.fromMillisecondsSinceEpoch(ts).toIso8601String();
      } else if (ts is String) {
        tanggal = ts;
      }
    }
    tanggal ??= DateTime.now().toIso8601String();

    final harvestId = local['harvest_id'] ?? local['id']?.toString() ?? '';
    final blockId =
        dbUuidToString(local['block_id']) ??
        local['block_id']?.toString().trim() ??
        '';
    final mandorId = local['mandor_id']?.toString() ?? '';
    final localCompanyId =
        dbUuidToString(local['company_id']) ??
        local['company_id']?.toString().trim() ??
        '';
    final notes = local['notes']?.toString().trim() ?? '';
    final photoUrl = await _extractPrimaryPhotoUrl(local);
    final localKaryawanId =
        dbUuidToString(local['karyawan_id']) ??
        local['karyawan_id']?.toString().trim() ??
        '';
    final localDivisionId =
        dbUuidToString(local['division_id']) ??
        local['division_id']?.toString().trim() ??
        '';
    final localEstateId =
        dbUuidToString(local['estate_id']) ??
        local['estate_id']?.toString().trim() ??
        '';
    final localKaryawanNik = local['karyawan_nik']?.toString().trim() ?? '';
    var localEmployeeDivisionId =
        dbUuidToString(local['employee_division_id']) ??
        local['employee_division_id']?.toString().trim() ??
        '';
    var localEmployeeDivisionName =
        local['employee_division_name']?.toString().trim() ?? '';

    if ((_isUuid(localKaryawanId)) &&
        (!_isUuid(localEmployeeDivisionId) ||
            localEmployeeDivisionName.isEmpty)) {
      try {
        final rows = await _databaseService.rawQuery(
          '''
          SELECT
            COALESCE(d_id.division_id, d_code.division_id) AS employee_division_id,
            COALESCE(
              NULLIF(TRIM(d_id.name), ''),
              NULLIF(TRIM(d_code.name), '')
            ) AS employee_division_name
          FROM employees e
          LEFT JOIN divisions d_id ON d_id.division_id = e.division_id
          LEFT JOIN divisions d_code ON d_code.code = e.division_id
          WHERE e.employee_id = ?
          LIMIT 1
          ''',
          [uuidToBytes(localKaryawanId)],
        );

        if (rows.isNotEmpty) {
          final row = rows.first;
          final resolvedEmployeeDivisionId =
              dbUuidToString(row['employee_division_id']) ??
              row['employee_division_id']?.toString().trim() ??
              '';
          final resolvedEmployeeDivisionName =
              row['employee_division_name']?.toString().trim() ?? '';

          if (!_isUuid(localEmployeeDivisionId) &&
              _isUuid(resolvedEmployeeDivisionId)) {
            localEmployeeDivisionId = resolvedEmployeeDivisionId;
          }
          if (localEmployeeDivisionName.isEmpty &&
              resolvedEmployeeDivisionName.isNotEmpty) {
            localEmployeeDivisionName = resolvedEmployeeDivisionName;
          }
        }
      } catch (e) {
        _logger.w(
          'Failed resolving employee division context for $localKaryawanId: $e',
        );
      }
    }
    if (!_isUuid(localEmployeeDivisionId)) {
      localEmployeeDivisionId = '';
    }

    final orgContext = await _resolveOrgContextForSync(
      blockId: blockId,
      localCompanyId: localCompanyId,
      localEstateId: localEstateId,
      localDivisionId: localDivisionId,
    );
    final resolvedCompanyId = orgContext['companyId'] ?? '';
    final resolvedDivisionId = orgContext['divisionId'] ?? '';
    final resolvedEstateId = orgContext['estateId'] ?? '';

    // Parse coordinates if stored as JSON string
    double? latitude;
    double? longitude;
    final coordinatesJson = local['coordinates'];
    if (coordinatesJson != null &&
        coordinatesJson is String &&
        coordinatesJson.isNotEmpty) {
      try {
        final coords = json.decode(coordinatesJson);
        latitude = coords['latitude']?.toDouble();
        longitude = coords['longitude']?.toDouble();
      } catch (e) {
        _logger.w('Failed to parse coordinates: $e');
      }
    }

    final jjgMatang = _toIntOrNull(local['jjg_matang']);
    final jjgMentah = _toIntOrNull(local['jjg_mentah']);
    final jjgLewatMatang = _toIntOrNull(local['jjg_lewat_matang']);
    final jjgBusukAbnormal = _toIntOrNull(local['jjg_busuk_abnormal']);
    final jjgTangkaiPanjang = _toIntOrNull(local['jjg_tangkai_panjang']);
    final totalBrondolan = _toDoubleOrNull(
      local['total_brondolan'] ?? local['brondolan'],
    );
    final hasQualityCounts = [
      jjgMatang,
      jjgMentah,
      jjgLewatMatang,
      jjgBusukAbnormal,
      jjgTangkaiPanjang,
    ].any((value) => value != null);

    final payload = <String, dynamic>{
      'localId': harvestId,
      'serverId': local['server_id'], // May be null for new records
      'tanggal': tanggal,
      'mandorId': mandorId,
      'blockId': blockId,
      'karyawanId': localKaryawanId,
      'karyawannik': localKaryawanNik,
      'beratTbs': (local['total_weight'] ?? 0.0).toDouble(),
      'jumlahJanjang': ((local['jumlah_janjang'] ?? local['total_tbs']) ?? 0)
          .toInt(),
      'status': _mapStatus(local['status']),
      'localVersion': local['local_version'] ?? local['version'] ?? 1,
      'lastUpdated': _getUpdatedAtIso(local),
    };

    if (blockId.isEmpty) {
      _logger.w(
        'Harvest $harvestId has empty block_id; payload will be rejected.',
      );
    }

    // Add optional fields only if they have valid values
    if (notes.isNotEmpty) {
      payload['notes'] = notes;
    }
    if (resolvedCompanyId.isNotEmpty) {
      payload['companyId'] = resolvedCompanyId;
    }
    if (resolvedDivisionId.isNotEmpty) {
      payload['divisionId'] = resolvedDivisionId;
    }
    if (resolvedEstateId.isNotEmpty) {
      payload['estateId'] = resolvedEstateId;
    }
    if (localEmployeeDivisionId.isNotEmpty) {
      payload['employeeDivisionId'] = localEmployeeDivisionId;
    }
    if (localEmployeeDivisionName.isNotEmpty) {
      payload['employeeDivisionName'] = localEmployeeDivisionName;
    }
    if (latitude != null) {
      payload['latitude'] = latitude;
    }
    if (longitude != null) {
      payload['longitude'] = longitude;
    }
    if (photoUrl.isNotEmpty) {
      payload['photoUrl'] = photoUrl;
    }
    if (hasQualityCounts) {
      payload['jjgMatang'] = jjgMatang ?? 0;
      payload['jjgMentah'] = jjgMentah ?? 0;
      payload['jjgLewatMatang'] = jjgLewatMatang ?? 0;
      payload['jjgBusukAbnormal'] = jjgBusukAbnormal ?? 0;
      payload['jjgTangkaiPanjang'] = jjgTangkaiPanjang ?? 0;
    }
    if (totalBrondolan != null) {
      payload['totalBrondolan'] = totalBrondolan;
    }

    return payload;
  }

  Future<String> _extractPrimaryPhotoUrl(Map<String, dynamic> local) async {
    final directPhoto = local['photo_url']?.toString().trim() ?? '';
    if (directPhoto.isNotEmpty) {
      return await _normalizePhotoSyncValue(directPhoto);
    }

    final imageUrl = local['image_url']?.toString().trim() ?? '';
    if (imageUrl.isNotEmpty) {
      return await _normalizePhotoSyncValue(imageUrl);
    }

    final rawPhotoPaths = local['photo_paths']?.toString().trim() ?? '';
    if (rawPhotoPaths.isEmpty) {
      return '';
    }

    try {
      final decoded = json.decode(rawPhotoPaths);
      if (decoded is List && decoded.isNotEmpty) {
        final first = decoded.first?.toString().trim() ?? '';
        return await _normalizePhotoSyncValue(first);
      }
    } catch (_) {
      // Legacy/non-JSON value fallback.
      return await _normalizePhotoSyncValue(rawPhotoPaths);
    }

    return '';
  }

  Future<String> _normalizePhotoSyncValue(String candidate) async {
    final value = candidate.trim();
    if (value.isEmpty) return '';

    final lower = value.toLowerCase();
    if (lower.startsWith('http://') ||
        lower.startsWith('https://') ||
        lower.startsWith('/uploads/') ||
        lower.startsWith('data:image/')) {
      return value;
    }

    try {
      final file = File(value);
      if (!await file.exists()) {
        return value;
      }

      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) {
        return value;
      }

      final mimeType = _mimeTypeFromPath(value);
      final encoded = base64Encode(bytes);
      return 'data:$mimeType;base64,$encoded';
    } catch (e) {
      _logger.w('Failed to encode photo file for sync ($value): $e');
      return value;
    }
  }

  String _mimeTypeFromPath(String path) {
    final normalized = path.trim().toLowerCase();
    if (normalized.endsWith('.png')) return 'image/png';
    if (normalized.endsWith('.webp')) return 'image/webp';
    if (normalized.endsWith('.heic')) return 'image/heic';
    if (normalized.endsWith('.heif')) return 'image/heif';
    return 'image/jpeg';
  }

  String _getUpdatedAtIso(Map<String, dynamic> local) {
    final updatedAt = local['updated_at'];
    if (updatedAt is int) {
      return DateTime.fromMillisecondsSinceEpoch(updatedAt).toIso8601String();
    } else if (updatedAt is String) {
      return updatedAt;
    }
    return DateTime.now().toIso8601String();
  }

  List<String> _validateSyncRecord(Map<String, dynamic> record) {
    final issues = <String>[];

    final localId = record['localId']?.toString().trim() ?? '';
    if (localId.isEmpty) {
      issues.add('localId kosong');
    }

    final mandorId = record['mandorId']?.toString().trim() ?? '';
    if (mandorId.isEmpty) {
      issues.add('mandorId kosong');
    }

    final blockId = record['blockId']?.toString().trim() ?? '';
    if (blockId.isEmpty) {
      issues.add('blockId kosong');
    } else if (!_isUuid(blockId)) {
      issues.add('blockId bukan UUID valid');
    }

    final karyawanNik = record['karyawannik']?.toString().trim() ?? '';
    if (karyawanNik.isEmpty) {
      issues.add('karyawannik kosong');
    }

    final tanggal = record['tanggal']?.toString().trim() ?? '';
    if (tanggal.isEmpty || DateTime.tryParse(tanggal) == null) {
      issues.add('tanggal tidak valid');
    }

    final karyawanId = record['karyawanId']?.toString().trim() ?? '';
    if (karyawanId.isEmpty) {
      issues.add('karyawanId kosong');
    } else if (!_isUuid(karyawanId)) {
      issues.add('karyawanId bukan UUID valid');
    }

    return issues;
  }

  Future<Map<String, String>> _resolveOrgContextForSync({
    required String blockId,
    required String localCompanyId,
    required String localEstateId,
    required String localDivisionId,
  }) async {
    var companyId = localCompanyId.trim();
    var estateId = localEstateId.trim();
    var divisionId = localDivisionId.trim();

    if ((!_isUuid(companyId) || !_isUuid(estateId) || !_isUuid(divisionId)) &&
        _isUuid(blockId)) {
      try {
        final rows = await _databaseService.rawQuery(
          '''
          SELECT
            b.division_id AS block_division_id,
            d.estate_id AS block_estate_id,
            e.company_id AS block_company_id
          FROM blocks b
          LEFT JOIN divisions d ON d.division_id = b.division_id
          LEFT JOIN estates e ON e.estate_id = d.estate_id
          WHERE b.block_id = ?
          LIMIT 1
          ''',
          [uuidToBytes(blockId)],
        );

        if (rows.isNotEmpty) {
          final row = rows.first;
          final resolvedDivisionId =
              dbUuidToString(row['block_division_id']) ??
              row['block_division_id']?.toString().trim() ??
              '';
          final resolvedEstateId =
              dbUuidToString(row['block_estate_id']) ??
              row['block_estate_id']?.toString().trim() ??
              '';
          final resolvedCompanyId =
              dbUuidToString(row['block_company_id']) ??
              row['block_company_id']?.toString().trim() ??
              '';

          if (!_isUuid(divisionId) && _isUuid(resolvedDivisionId)) {
            divisionId = resolvedDivisionId;
          }
          if (!_isUuid(estateId) && _isUuid(resolvedEstateId)) {
            estateId = resolvedEstateId;
          }
          if (!_isUuid(companyId) && _isUuid(resolvedCompanyId)) {
            companyId = resolvedCompanyId;
          }
        }
      } catch (e) {
        _logger.w('Failed resolving org context by block $blockId: $e');
      }
    }

    return {
      'companyId': companyId,
      'estateId': estateId,
      'divisionId': divisionId,
    };
  }

  bool _isUuid(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return false;
    return isUuidString(trimmed);
  }

  Map<String, dynamic> _toServerSyncRecord(Map<String, dynamic> record) {
    final normalized = Map<String, dynamic>.from(record);
    final karyawanNik = normalized['karyawannik']?.toString().trim() ?? '';
    if (karyawanNik.isNotEmpty) {
      normalized['nik'] = karyawanNik;
    }
    normalized.remove('karyawannik');
    return normalized;
  }

  String _buildSyncPayloadPreview(Map<String, dynamic> payload) {
    final recordsRaw = payload['records'];
    final records = recordsRaw is List ? recordsRaw : const [];
    final previews = records.take(3).map((record) {
      if (record is! Map<String, dynamic>) {
        return {'invalidRecord': true};
      }

      final rawPhoto = record['photoUrl']?.toString() ?? '';
      String? photoSummary;
      if (rawPhoto.isNotEmpty) {
        if (rawPhoto.startsWith('data:image/')) {
          photoSummary = 'data-uri(${rawPhoto.length} chars)';
        } else {
          photoSummary = rawPhoto;
        }
      }

      return {
        'localId': record['localId'],
        'serverId': record['serverId'],
        'tanggal': record['tanggal'],
        'mandorId': record['mandorId'],
        'blockId': record['blockId'],
        'karyawanId': record['karyawanId'],
        'nik': record['nik'],
        if (record['employeeDivisionId'] != null)
          'employeeDivisionId': record['employeeDivisionId'],
        if (record['employeeDivisionName'] != null)
          'employeeDivisionName': record['employeeDivisionName'],
        'beratTbs': record['beratTbs'],
        'jumlahJanjang': record['jumlahJanjang'],
        'status': record['status'],
        if (record['notes'] != null) 'notes': record['notes'],
        if (record['latitude'] != null) 'latitude': record['latitude'],
        if (record['longitude'] != null) 'longitude': record['longitude'],
        if (record['jjgMatang'] != null) 'jjgMatang': record['jjgMatang'],
        if (record['jjgMentah'] != null) 'jjgMentah': record['jjgMentah'],
        if (record['jjgLewatMatang'] != null)
          'jjgLewatMatang': record['jjgLewatMatang'],
        if (record['jjgBusukAbnormal'] != null)
          'jjgBusukAbnormal': record['jjgBusukAbnormal'],
        if (record['jjgTangkaiPanjang'] != null)
          'jjgTangkaiPanjang': record['jjgTangkaiPanjang'],
        if (record['totalBrondolan'] != null)
          'totalBrondolan': record['totalBrondolan'],
        'photoUrl': ?photoSummary,
      };
    }).toList();

    final preview = {
      'deviceId': payload['deviceId'],
      'clientTimestamp': payload['clientTimestamp'],
      'recordsCount': records.length,
      'recordsPreview': previews,
    };
    return json.encode(preview);
  }

  int? _toIntOrNull(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value.toString());
  }

  double? _toDoubleOrNull(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }

  String _mapStatus(String? status) {
    // Map local status string to GraphQL Enum
    switch (status) {
      case 'APPROVED':
        return 'APPROVED';
      case 'REJECTED':
        return 'REJECTED';
      default:
        return 'PENDING';
    }
  }

  Future<void> _markAsSynced(List<Map<String, dynamic>> records) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final currentMandorId = await _getCurrentMandorIdForSync();
    if (currentMandorId == null) {
      _logger.w('Cannot mark synced records: current mandor session not found');
      return;
    }

    int updatedCount = 0;
    for (var record in records) {
      final recordId = record['harvest_id'] ?? record['id'].toString();

      final affectedRows = await _databaseService.update(
        'harvest_records',
        {
          'sync_status': 'SYNCED',
          'needs_sync': 0,
          'synced_at': now,
          'sync_error_message': null,
          'sync_retry_count': 0,
          'last_sync_attempt': null,
        },
        where: 'harvest_id = ? AND mandor_id = ?',
        whereArgs: [recordId, currentMandorId],
      );
      if (affectedRows == 0) {
        _logger.w(
          'Could not mark synced for local harvest $recordId (row not found/mandor mismatch)',
        );
        continue;
      }
      updatedCount++;
    }

    _logger.i('Marked $updatedCount/${records.length} harvests as synced.');
  }

  /// Process per-record sync results from server response
  /// This ensures only successfully synced records are marked as SYNCED
  Future<void> _processPerRecordResults(
    List<dynamic> results,
    List<Map<String, dynamic>> localRecords,
  ) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final currentMandorId = await _getCurrentMandorIdForSync();
    if (currentMandorId == null) {
      _logger.w(
        'Skipping per-record sync status update: current mandor session not found',
      );
      return;
    }
    int successCount = 0;
    int failedCount = 0;

    // Create a map of localId -> local record for quick lookup
    final localRecordMap = <String, Map<String, dynamic>>{};
    for (var record in localRecords) {
      final localId = record['harvest_id'] ?? record['id']?.toString() ?? '';
      if (localId.isNotEmpty) {
        localRecordMap[localId] = record;
      }
    }

    for (var result in results) {
      final localId = result['localId']?.toString() ?? '';
      final success = result['success'] == true;
      final serverId = result['serverId']?.toString();
      final error = result['error']?.toString();

      if (localId.isEmpty) {
        _logger.w('Sync result missing localId: $result');
        continue;
      }
      if (!localRecordMap.containsKey(localId)) {
        failedCount++;
        _logger.w(
          'Server returned result for unknown local harvest $localId; skipping local status update',
        );
        continue;
      }

      if (success) {
        // Mark as synced and store server ID
        final affectedRows = await _databaseService.update(
          'harvest_records',
          {
            'sync_status': 'SYNCED',
            'needs_sync': 0,
            'synced_at': now,
            'sync_error_message': null,
            'sync_retry_count': 0,
            'last_sync_attempt': null,
            if (serverId != null && serverId.isNotEmpty) 'server_id': serverId,
          },
          where: 'harvest_id = ? AND mandor_id = ?',
          whereArgs: [localId, currentMandorId],
        );
        if (affectedRows == 0) {
          failedCount++;
          _logger.w(
            'Server accepted harvest $localId but local row was not updated (row not found/mandor mismatch)',
          );
          continue;
        }
        successCount++;
        _logger.d('Harvest $localId synced successfully (serverId: $serverId)');
      } else {
        // Mark as sync failed with error message
        final friendlyError = SyncErrorMessageHelper.toUserMessage(
          error ?? 'Unknown sync error',
          action: 'sinkronisasi data panen',
        );
        await _markSyncFailed(localId, friendlyError);
        failedCount++;
        _logger.w('Harvest $localId sync failed: $error');
      }
    }

    _logger.i(
      'Per-record sync processing: $successCount success, $failedCount failed',
    );
  }

  /// Mark a specific harvest record as sync failed
  Future<void> _markSyncFailed(String harvestId, String errorMessage) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final currentMandorId = await _getCurrentMandorIdForSync();
    if (currentMandorId == null) {
      _logger.w(
        'Cannot mark sync failed for $harvestId: current mandor session not found',
      );
      return;
    }

    // Get current retry count
    final existing = await _databaseService.query(
      'harvest_records',
      where: 'harvest_id = ? AND mandor_id = ?',
      whereArgs: [harvestId, currentMandorId],
      limit: 1,
    );

    int retryCount = 0;
    if (existing.isNotEmpty) {
      retryCount = (existing.first['sync_retry_count'] ?? 0) as int;
    }

    await _databaseService.update(
      'harvest_records',
      {
        'sync_status': 'FAILED',
        'needs_sync': 1, // Still needs sync
        'sync_error_message': errorMessage,
        'sync_retry_count': retryCount + 1,
        'last_sync_attempt': now,
      },
      where: 'harvest_id = ? AND mandor_id = ?',
      whereArgs: [harvestId, currentMandorId],
    );

    _logger.w(
      'Marked harvest $harvestId as sync failed (retry #${retryCount + 1}): $errorMessage',
    );
  }

  /// Get count of failed sync records
  Future<int> getFailedSyncCount() async {
    final currentMandorId = await _getCurrentMandorIdForSync();
    if (currentMandorId == null) {
      return 0;
    }

    final results = await _databaseService.query(
      'harvest_records',
      where: "sync_status = 'FAILED' AND mandor_id = ?",
      whereArgs: [currentMandorId],
    );
    return results.length;
  }

  /// Get count of harvest records that are still waiting to be uploaded.
  Future<int> getPendingSyncCount() async {
    final pending = await _getUnsyncedHarvestsLocally();
    return pending.length;
  }

  /// Get latest sync error messages for pending/failed harvest records.
  Future<List<String>> getRecentSyncErrorMessages({int limit = 3}) async {
    final currentMandorId = await _getCurrentMandorIdForSync();
    if (currentMandorId == null) {
      return const [];
    }

    final safeLimit = limit < 1 ? 1 : limit;
    final rows = await _databaseService.query(
      'harvest_records',
      columns: const ['sync_error_message'],
      where:
          "mandor_id = ? AND needs_sync = 1 AND sync_error_message IS NOT NULL AND TRIM(sync_error_message) != ''",
      whereArgs: [currentMandorId],
      orderBy: 'last_sync_attempt DESC, updated_at DESC',
      limit: safeLimit,
    );

    final seen = <String>{};
    final messages = <String>[];
    for (final row in rows) {
      final message = row['sync_error_message']?.toString().trim() ?? '';
      if (message.isEmpty || seen.contains(message)) {
        continue;
      }
      seen.add(message);
      messages.add(message);
    }
    return messages;
  }

  /// Retry failed syncs (with exponential backoff based on retry count)
  Future<void> retryFailedSyncs({int maxRetries = 5}) async {
    final currentMandorId = await _getCurrentMandorIdForSync();
    if (currentMandorId == null) {
      _logger.w('Cannot retry failed syncs: current mandor session not found');
      return;
    }

    final failedRecords = await _databaseService.query(
      'harvest_records',
      where:
          "sync_status = 'FAILED' AND mandor_id = ? AND (sync_retry_count IS NULL OR sync_retry_count < ?)",
      whereArgs: [currentMandorId, maxRetries],
    );

    if (failedRecords.isEmpty) {
      _logger.i('No failed records to retry');
      return;
    }

    _logger.i('Retrying ${failedRecords.length} failed sync records...');

    // Reset status to PENDING for retry
    for (var record in failedRecords) {
      final harvestId = record['harvest_id'] ?? record['id']?.toString();
      if (harvestId != null) {
        await _databaseService.update(
          'harvest_records',
          {'sync_status': 'PENDING'},
          where: 'harvest_id = ? AND mandor_id = ?',
          whereArgs: [harvestId, currentMandorId],
        );
      }
    }

    // Trigger sync
    await syncNow();
  }
}
