import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:logger/logger.dart';
import '../graphql/graphql_client.dart';
import '../graphql/auth_service.dart';
import '../graphql/mandor_master_sync_queries.dart';
import '../database/enhanced_database_service.dart';
import '../database/uuid_blob_codec.dart';
import '../utils/sync_error_message_helper.dart';
import 'device_service.dart';
import 'unified_secure_storage_service.dart';

/// Service for Mandor master data sync (one-way: server → local)
/// Handles syncing employees and blocks from server to local SQLite
class MandorMasterSyncService {
  final AgroGraphQLClient _graphqlClient;
  final EnhancedDatabaseService _databaseService;
  final Logger _logger = Logger();
  static const String _reloginMessage =
      'Sesi berakhir. Silakan login ulang untuk melanjutkan sinkronisasi.';
  static const Duration _divisionsFullRebaseInterval = Duration(hours: 24);
  static const Duration _blocksFullRebaseInterval = Duration(hours: 12);
  static const Duration _employeesFullRebaseInterval = Duration(hours: 6);

  MandorMasterSyncService({
    required AgroGraphQLClient graphqlClient,
    required EnhancedDatabaseService databaseService,
  }) : _graphqlClient = graphqlClient,
       _databaseService = databaseService;

  int _toSqliteActiveFlag(dynamic value) {
    if (value is bool) return value ? 1 : 0;
    if (value is num) return value != 0 ? 1 : 0;
    if (value is String) {
      final normalized = value.trim().toLowerCase();
      if (normalized == 'true' || normalized == '1' || normalized == 'yes') {
        return 1;
      }
      if (normalized == 'false' || normalized == '0' || normalized == 'no') {
        return 0;
      }
    }
    // Backward-compatible default: keep employee visible when server omits flag.
    return 1;
  }

  double? _toNullableDouble(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }

  Map<String, dynamic> _cleanVariables(Map<String, dynamic> variables) {
    final cleaned = <String, dynamic>{};
    variables.forEach((key, value) {
      if (value == null) return;
      if (value is String && value.trim().isEmpty) return;
      cleaned[key] = value;
    });
    return cleaned;
  }

  String _fallbackCodeFromId(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return 'UNKNOWN';
    final maxLength = trimmed.length < 8 ? trimmed.length : 8;
    return trimmed.substring(0, maxLength).toUpperCase();
  }

  bool _isValidUuid(String value) {
    try {
      uuidToBytes(value);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<String?> _getCurrentCompanyId() async {
    final user = await UnifiedSecureStorageService.getUserInfo();
    if (user == null) {
      return null;
    }

    final directCompanyId = user.companyId?.trim();
    if (directCompanyId != null && directCompanyId.isNotEmpty) {
      return directCompanyId;
    }

    final effectiveCompanies = user.getEffectiveCompanies();
    for (final companyId in effectiveCompanies) {
      final trimmed = companyId.trim();
      if (trimmed.isNotEmpty) {
        return trimmed;
      }
    }

    return null;
  }

  Future<Set<String>> _getAssignedDivisionIds() async {
    final user = await UnifiedSecureStorageService.getUserInfo();
    if (user == null) {
      return <String>{};
    }

    final divisionIds = <String>{};
    for (final divisionId in user.getEffectiveDivisions()) {
      final trimmed = divisionId.trim();
      if (trimmed.isNotEmpty) {
        divisionIds.add(trimmed);
      }
    }

    return divisionIds;
  }

  Future<void> _ensureCompanyExists(String companyId) async {
    final existing = await _databaseService.query(
      'companies',
      where: 'company_id = ?',
      whereArgs: [companyId],
      limit: 1,
    );
    if (existing.isNotEmpty) {
      return;
    }

    await _upsertCompany({
      'id': companyId,
      'code': _fallbackCodeFromId(companyId),
      'name': 'Company $companyId',
    });
  }

  Future<void> _ensureEstateExists(String estateId, String companyId) async {
    final existing = await _databaseService.query(
      'estates',
      where: 'estate_id = ?',
      whereArgs: [estateId],
      limit: 1,
    );
    if (existing.isNotEmpty) {
      return;
    }

    final now = DateTime.now().millisecondsSinceEpoch;
    await _ensureCompanyExists(companyId);
    await _databaseService.insert('estates', {
      'estate_id': estateId,
      'company_id': companyId,
      'code': _fallbackCodeFromId(estateId),
      'name': 'Estate $estateId',
      'is_active': 1,
      'created_at': now,
      'updated_at': now,
      'sync_status': 'SYNCED',
      'synced_at': now,
    });
  }

  /// Sync all master data (backward-compatible alias)
  Future<MasterSyncResult> syncAll() async {
    return syncMasterData();
  }

  /// Sync master data with per-table full/incremental decisions.
  Future<MasterSyncResult> syncMasterData({bool forceFull = false}) async {
    final currentMandorId = await _getCurrentMandorIdOrNull();
    if (currentMandorId == null) {
      _logger.w(
        'Current mandor id unavailable, falling back to full master sync without persisted cursors',
      );
      return _runFullMasterSync();
    }

    final now = DateTime.now().toUtc();
    final currentFingerprint = await _buildAssignmentFingerprint();
    final storedFingerprint = await _readSetting(
      _buildAssignmentFingerprintKey(currentMandorId),
    );
    final assignmentChanged =
        currentFingerprint.isNotEmpty && currentFingerprint != storedFingerprint;

    if (assignmentChanged) {
      _logger.i(
        'Mandor assignment fingerprint changed. Forcing full sync for all master tables.',
      );
    }

    final divisionsLastFullSyncAt = await _readDateTimeSetting(
      _buildDivisionsLastFullSyncKey(currentMandorId),
    );
    final divisionsCursor = await _readDateTimeSetting(
      _buildDivisionsCursorKey(currentMandorId),
    );
    final shouldFullSyncDivisions =
        forceFull ||
        assignmentChanged ||
        divisionsCursor == null ||
        divisionsLastFullSyncAt == null ||
        now.difference(divisionsLastFullSyncAt) >= _divisionsFullRebaseInterval;

    final blocksLastFullSyncAt = await _readDateTimeSetting(
      _buildBlocksLastFullSyncKey(currentMandorId),
    );
    final blocksCursor = await _readDateTimeSetting(
      _buildBlocksCursorKey(currentMandorId),
    );
    final shouldFullSyncBlocks =
        forceFull ||
        assignmentChanged ||
        blocksCursor == null ||
        blocksLastFullSyncAt == null ||
        now.difference(blocksLastFullSyncAt) >= _blocksFullRebaseInterval;

    final employeesLastFullSyncAt = await _readDateTimeSetting(
      _buildEmployeesLastFullSyncKey(currentMandorId),
    );
    final employeesCursor = await _readDateTimeSetting(
      _buildEmployeesCursorKey(currentMandorId),
    );
    final shouldFullSyncEmployees =
        forceFull ||
        assignmentChanged ||
        employeesCursor == null ||
        employeesLastFullSyncAt == null ||
        now.difference(employeesLastFullSyncAt) >=
            _employeesFullRebaseInterval;

    final result = MasterSyncResult();
    final snapshot = _MasterSyncScopeSnapshot();

    final divisionResult = shouldFullSyncDivisions
        ? await _syncDivisionsInternal(snapshot)
        : await _syncDivisionsIncrementalInternal(
            snapshot,
            since: divisionsCursor!,
          );
    result.divisionsSynced = divisionResult.count;
    result.divisionsSuccess = divisionResult.success;
    result.divisionsMode = divisionResult.mode;

    if (divisionResult.success) {
      await _persistSyncMetadata(
        mandorId: currentMandorId,
        cursorKey: _buildDivisionsCursorKey(currentMandorId),
        cursorDescription: 'Last divisions sync cursor for mandor $currentMandorId',
        cursor: divisionResult.latestCursor,
        lastFullKey: _buildDivisionsLastFullSyncKey(currentMandorId),
        lastFullDescription:
            'Last divisions full sync timestamp for mandor $currentMandorId',
        lastFullAt: shouldFullSyncDivisions ? now : null,
      );
      if (currentFingerprint.isNotEmpty) {
        await _writeSetting(
          _buildAssignmentFingerprintKey(currentMandorId),
          currentFingerprint,
          description: 'Assignment fingerprint for mandor $currentMandorId',
        );
      }
    }

    final blockResult = shouldFullSyncBlocks
        ? await _syncBlocksInternal(snapshot)
        : await _syncBlocksIncrementalInternal(
            since: blocksCursor!,
          );
    result.blocksSynced = blockResult.count;
    result.blocksSuccess = blockResult.success;
    result.blocksMode = blockResult.mode;

    if (blockResult.success) {
      await _persistSyncMetadata(
        mandorId: currentMandorId,
        cursorKey: _buildBlocksCursorKey(currentMandorId),
        cursorDescription: 'Last blocks sync cursor for mandor $currentMandorId',
        cursor: blockResult.latestCursor,
        lastFullKey: _buildBlocksLastFullSyncKey(currentMandorId),
        lastFullDescription:
            'Last blocks full sync timestamp for mandor $currentMandorId',
        lastFullAt: shouldFullSyncBlocks ? now : null,
      );
    }

    final employeeResult = shouldFullSyncEmployees
        ? await _syncEmployeesInternal(snapshot)
        : await _syncEmployeesIncrementalInternal(
            since: employeesCursor!,
          );
    result.employeesSynced = employeeResult.count;
    result.employeesSuccess = employeeResult.success;
    result.employeesMode = employeeResult.mode;

    if (employeeResult.success) {
      await _persistSyncMetadata(
        mandorId: currentMandorId,
        cursorKey: _buildEmployeesCursorKey(currentMandorId),
        cursorDescription:
            'Last employees sync cursor for mandor $currentMandorId',
        cursor: employeeResult.latestCursor,
        lastFullKey: _buildEmployeesLastFullSyncKey(currentMandorId),
        lastFullDescription:
            'Last employees full sync timestamp for mandor $currentMandorId',
        lastFullAt: shouldFullSyncEmployees ? now : null,
      );
    }

    if (shouldFullSyncDivisions) {
      if (snapshot.divisionsFetched) {
        await _deactivateOutOfScopeDivisions(snapshot.divisionIds);
      } else {
        _logger.w(
          'Skipping division reconciliation because assignment masters full sync did not complete',
        );
      }
    }

    if (shouldFullSyncEmployees) {
      if (snapshot.divisionsFetched && snapshot.employeesFetched) {
        await _deactivateOutOfScopeEmployees(
          snapshot.divisionIds,
          snapshot.employeeIds,
        );
      } else {
        _logger.w(
          'Skipping employee reconciliation because employees full sync did not complete',
        );
      }
    }

    if (shouldFullSyncBlocks) {
      if (snapshot.divisionsFetched && snapshot.blocksFetched) {
        await _deactivateOutOfScopeBlocks(snapshot.divisionIds, snapshot.blockIds);
      } else {
        _logger.w(
          'Skipping block reconciliation because blocks full sync did not complete',
        );
      }
    }

    result.success =
        divisionResult.success && employeeResult.success && blockResult.success;
    result.message = result.success
        ? 'Sync completed: ${result.divisionsSynced} divisions, '
              '${result.employeesSynced} employees, ${result.blocksSynced} blocks'
        : _composePartialSyncMessage(
            divisionError: divisionResult.error,
            employeeError: employeeResult.error,
            blockError: blockResult.error,
          );

    return result;
  }

  Future<MasterSyncResult> _runFullMasterSync() async {
    _logger.i('Starting Mandor master data sync...');

    final result = MasterSyncResult();
    final snapshot = _MasterSyncScopeSnapshot();

    try {
      // Sync assignment masters (companies, estates, divisions)
      final divisionResult = await _syncDivisionsInternal(snapshot);
      result.divisionsSynced = divisionResult.count;
      result.divisionsSuccess = divisionResult.success;
      result.divisionsMode = divisionResult.mode;

      // Sync employees
      final employeeResult = await _syncEmployeesInternal(snapshot);
      result.employeesSynced = employeeResult.count;
      result.employeesSuccess = employeeResult.success;
      result.employeesMode = employeeResult.mode;

      // Sync blocks
      final blockResult = await _syncBlocksInternal(snapshot);
      result.blocksSynced = blockResult.count;
      result.blocksSuccess = blockResult.success;
      result.blocksMode = blockResult.mode;

      if (snapshot.divisionsFetched) {
        await _deactivateOutOfScopeDivisions(snapshot.divisionIds);
      } else {
        _logger.w(
          'Skipping division reconciliation because assignment masters were not fetched successfully',
        );
      }

      if (snapshot.divisionsFetched && snapshot.employeesFetched) {
        await _deactivateOutOfScopeEmployees(
          snapshot.divisionIds,
          snapshot.employeeIds,
        );
      } else {
        _logger.w(
          'Skipping employee reconciliation because current sync scope was not fetched completely',
        );
      }

      if (snapshot.divisionsFetched && snapshot.blocksFetched) {
        await _deactivateOutOfScopeBlocks(snapshot.divisionIds, snapshot.blockIds);
      } else {
        _logger.w(
          'Skipping block reconciliation because current sync scope was not fetched completely',
        );
      }

      result.success =
          divisionResult.success &&
          employeeResult.success &&
          blockResult.success;
      result.message = result.success
          ? 'Sync completed: ${result.divisionsSynced} divisions, ${result.employeesSynced} employees, ${result.blocksSynced} blocks'
          : _composePartialSyncMessage(
              divisionError: divisionResult.error,
              employeeError: employeeResult.error,
              blockError: blockResult.error,
            );

      _logger.i('Master data sync completed: ${result.message}');
    } catch (e) {
      _logger.e('Master data sync failed: $e');
      result.success = false;
      result.message = SyncErrorMessageHelper.toUserMessage(
        e,
        action: 'sinkronisasi data master',
      );
    }

    return result;
  }

  /// Sync division master references (companies, estates, divisions)
  Future<SyncItemResult> syncDivisions() async {
    return _syncDivisionsInternal();
  }

  Future<SyncItemResult> _syncDivisionsInternal([
    _MasterSyncScopeSnapshot? snapshot,
  ]) async {
    _logger.i('Syncing division masters from server...');

    try {
      final hasValidAuth = await _ensureAuthWithTier();
      if (!hasValidAuth) {
        _logger.w(_reloginMessage);
        return SyncItemResult(success: false, count: 0, error: _reloginMessage);
      }

      final options = QueryOptions(
        document: gql(MandorMasterSyncQueries.getAssignmentMasters),
        fetchPolicy: FetchPolicy.networkOnly,
      );

      final result = await _graphqlClient.query(options);

      if (result.hasException) {
        _logger.e('GraphQL Error syncing divisions: ${result.exception}');
        return SyncItemResult(
          success: false,
          count: 0,
          error: SyncErrorMessageHelper.toUserMessage(
            result.exception!,
            action: 'sinkronisasi data divisi',
          ),
        );
      }

      final assignments =
          result.data?['myAssignments'] as Map<String, dynamic>? ?? {};
      final companies = assignments['companies'] as List<dynamic>? ?? [];
      final estates = assignments['estates'] as List<dynamic>? ?? [];
      final divisions = assignments['divisions'] as List<dynamic>? ?? [];
      final latestUpdatedAt = _extractLatestUpdatedAtFromGroups([
        companies,
        estates,
        divisions,
      ]);
      final activeDivisionIds = <String>{};

      for (final division in divisions) {
        final divisionMap = Map<String, dynamic>.from(division as Map);
        final divisionId = divisionMap['id']?.toString().trim() ?? '';
        if (divisionId.isNotEmpty) {
          activeDivisionIds.add(divisionId);
        }
      }

      if (activeDivisionIds.isEmpty) {
        const message =
            'Assignment divisi mandor tidak ditemukan. Silakan login ulang atau hubungi admin.';
        _logger.w(message);
        return SyncItemResult(success: false, count: 0, error: message);
      }

      if (snapshot != null) {
        snapshot.divisionIds
          ..clear()
          ..addAll(activeDivisionIds);
        snapshot.divisionsFetched = true;
      }

      _logger.i(
        'Assignment scope resolved for mandor: ${activeDivisionIds.length} divisions',
      );

      int companySynced = 0;
      int estateSynced = 0;
      int divisionSynced = 0;
      int companyFailed = 0;
      int estateFailed = 0;
      int divisionFailed = 0;

      for (final company in companies) {
        try {
          await _upsertCompany(Map<String, dynamic>.from(company as Map));
          companySynced++;
        } catch (e) {
          companyFailed++;
          _logger.w('Failed to upsert company: $e');
        }
      }

      for (final estate in estates) {
        try {
          await _upsertEstate(Map<String, dynamic>.from(estate as Map));
          estateSynced++;
        } catch (e) {
          estateFailed++;
          _logger.w('Failed to upsert estate: $e');
        }
      }

      for (final division in divisions) {
        try {
          await _upsertDivision(Map<String, dynamic>.from(division as Map));
          divisionSynced++;
        } catch (e) {
          divisionFailed++;
          _logger.w('Failed to upsert division: $e');
        }
      }

      final totalFailed = companyFailed + estateFailed + divisionFailed;
      final success = totalFailed == 0;
      _logger.i(
        'Synced assignment masters: $companySynced companies, '
        '$estateSynced estates, $divisionSynced divisions '
        '(failed: company=$companyFailed, estate=$estateFailed, division=$divisionFailed)',
      );
      return SyncItemResult(
        success: success,
        count: divisionSynced,
        latestCursor: success ? latestUpdatedAt : null,
        mode: 'full',
        error: success
            ? null
            : 'Sebagian data master gagal disimpan '
                  '(company=$companyFailed, estate=$estateFailed, division=$divisionFailed). '
                  'Silakan ulangi sinkronisasi.',
      );
    } catch (e) {
      _logger.e('Error syncing division masters: $e');
      return SyncItemResult(
        success: false,
        count: 0,
        error: SyncErrorMessageHelper.toUserMessage(
          e,
          action: 'sinkronisasi data divisi',
        ),
      );
    }
  }

  Future<SyncItemResult> _syncDivisionsIncrementalInternal(
    _MasterSyncScopeSnapshot? snapshot, {
    required DateTime since,
  }) async {
    _logger.i('Syncing divisions incrementally from server since $since...');

    try {
      final hasValidAuth = await _ensureAuthWithTier();
      if (!hasValidAuth) {
        _logger.w(_reloginMessage);
        return SyncItemResult(
          success: false,
          count: 0,
          error: _reloginMessage,
          mode: 'incremental',
        );
      }

      final assignedDivisionIds = await _getAssignedDivisionIds();
      if (snapshot != null && assignedDivisionIds.isNotEmpty) {
        snapshot.divisionIds
          ..clear()
          ..addAll(assignedDivisionIds);
      }

      final options = QueryOptions(
        document: gql(MandorMasterSyncQueries.getAssignmentMastersIncremental),
        variables: {'updatedSince': since.toIso8601String()},
        fetchPolicy: FetchPolicy.networkOnly,
      );

      final result = await _graphqlClient.query(options);

      if (result.hasException) {
        _logger.e(
          'GraphQL Error syncing divisions incrementally: ${result.exception}',
        );
        return SyncItemResult(
          success: false,
          count: 0,
          error: SyncErrorMessageHelper.toUserMessage(
            result.exception!,
            action: 'sinkronisasi incremental data divisi',
          ),
          mode: 'incremental',
        );
      }

      final assignments =
          result.data?['mandorDivisionMastersSync'] as Map<String, dynamic>? ??
          {};
      final companies = assignments['companies'] as List<dynamic>? ?? [];
      final estates = assignments['estates'] as List<dynamic>? ?? [];
      final divisions = assignments['divisions'] as List<dynamic>? ?? [];
      final latestUpdatedAt = _extractLatestUpdatedAtFromGroups([
        companies,
        estates,
        divisions,
      ]);

      int companySynced = 0;
      int estateSynced = 0;
      int divisionSynced = 0;
      int companyFailed = 0;
      int estateFailed = 0;
      int divisionFailed = 0;

      for (final company in companies) {
        try {
          await _upsertCompany(Map<String, dynamic>.from(company as Map));
          companySynced++;
        } catch (e) {
          companyFailed++;
          _logger.w('Failed to upsert company incrementally: $e');
        }
      }

      for (final estate in estates) {
        try {
          await _upsertEstate(Map<String, dynamic>.from(estate as Map));
          estateSynced++;
        } catch (e) {
          estateFailed++;
          _logger.w('Failed to upsert estate incrementally: $e');
        }
      }

      for (final division in divisions) {
        try {
          await _upsertDivision(Map<String, dynamic>.from(division as Map));
          divisionSynced++;
        } catch (e) {
          divisionFailed++;
          _logger.w('Failed to upsert division incrementally: $e');
        }
      }

      final totalFailed = companyFailed + estateFailed + divisionFailed;
      final success = totalFailed == 0;
      _logger.i(
        'Incremental divisions sync stored $companySynced companies, '
        '$estateSynced estates, $divisionSynced divisions '
        '(failed: company=$companyFailed, estate=$estateFailed, division=$divisionFailed)',
      );

      return SyncItemResult(
        success: success,
        count: divisionSynced,
        latestCursor: success ? latestUpdatedAt : null,
        mode: 'incremental',
        error: success
            ? null
            : 'Sebagian perubahan data divisi gagal disimpan '
                  '(company=$companyFailed, estate=$estateFailed, division=$divisionFailed). '
                  'Silakan ulangi sinkronisasi.',
      );
    } catch (e) {
      _logger.e('Error syncing divisions incrementally: $e');
      return SyncItemResult(
        success: false,
        count: 0,
        error: SyncErrorMessageHelper.toUserMessage(
          e,
          action: 'sinkronisasi incremental data divisi',
        ),
        mode: 'incremental',
      );
    }
  }

  /// Sync employees from server to local SQLite
  Future<SyncItemResult> syncEmployees({
    String? divisionId,
    String? search,
  }) async {
    return _syncEmployeesInternal(
      null,
      divisionId: divisionId,
      search: search,
    );
  }

  Future<SyncItemResult> _syncEmployeesInternal(
    _MasterSyncScopeSnapshot? snapshot, {
    String? divisionId,
    String? search,
  }) async {
    _logger.i('Syncing employees from server...');

    try {
      final hasValidAuth = await _ensureAuthWithTier();
      if (!hasValidAuth) {
        _logger.w(_reloginMessage);
        return SyncItemResult(success: false, count: 0, error: _reloginMessage);
      }

      final normalizedDivisionId = divisionId?.trim();
      final assignedDivisionIds = snapshot != null && snapshot.divisionIds.isNotEmpty
          ? Set<String>.from(snapshot.divisionIds)
          : await _getAssignedDivisionIds();
      if (assignedDivisionIds.isEmpty) {
        const message =
            'Assignment divisi mandor tidak ditemukan. Silakan login ulang atau hubungi admin.';
        _logger.w(message);
        return SyncItemResult(success: false, count: 0, error: message);
      }

      if (normalizedDivisionId != null &&
          normalizedDivisionId.isNotEmpty &&
          !assignedDivisionIds.contains(normalizedDivisionId)) {
        const message =
            'Divisi yang diminta berada di luar assignment mandor. Sinkronisasi dibatalkan.';
        _logger.w(
          '$message requestedDivisionId=$normalizedDivisionId assigned=$assignedDivisionIds',
        );
        return SyncItemResult(success: false, count: 0, error: message);
      }

      final permittedDivisionIds =
          normalizedDivisionId != null && normalizedDivisionId.isNotEmpty
          ? <String>{normalizedDivisionId}
          : assignedDivisionIds;

      final QueryOptions options = QueryOptions(
        document: gql(MandorMasterSyncQueries.getEmployees),
        variables: _cleanVariables({
          'divisionId': normalizedDivisionId,
          'search': search?.trim(),
        }),
        fetchPolicy: FetchPolicy.networkOnly,
      );

      final result = await _graphqlClient.query(options);

      if (result.hasException) {
        _logger.e('GraphQL Error syncing employees: ${result.exception}');
        return SyncItemResult(
          success: false,
          count: 0,
          error: SyncErrorMessageHelper.toUserMessage(
            result.exception!,
            action: 'sinkronisasi data karyawan',
          ),
        );
      }

      final employees = result.data?['mandorEmployees'] as List<dynamic>? ?? [];
      final latestUpdatedAt = _extractLatestUpdatedAt(employees);
      _logger.i('Received ${employees.length} employees from server');
      if (snapshot != null) {
        snapshot.employeesFetched = true;
      }

      final currentCompanyId = await _getCurrentCompanyId();
      if (currentCompanyId == null || currentCompanyId.isEmpty) {
        return SyncItemResult(
          success: false,
          count: 0,
          error: 'Company user login tidak ditemukan. Silakan login ulang.',
        );
      }

      int syncedCount = 0;
      int failedCount = 0;
      int skippedOutOfScopeCount = 0;
      final authoritativeEmployeeIds = <String>{};
      for (var emp in employees) {
        final employeeId = emp['id']?.toString().trim() ?? '';
        final employeeDivisionId = emp['divisionId']?.toString().trim() ?? '';
        if (employeeId.isEmpty) {
          failedCount++;
          _logger.w('Skip employee payload without id: $emp');
          continue;
        }

        if (!_isValidUuid(employeeId)) {
          failedCount++;
          _logger.w('Skip employee payload with invalid UUID: $employeeId');
          continue;
        }

        if (employeeDivisionId.isEmpty ||
            !permittedDivisionIds.contains(employeeDivisionId)) {
          skippedOutOfScopeCount++;
          _logger.w(
            'Skipping out-of-scope employee payload '
            'employee_id=$employeeId division_id=$employeeDivisionId',
          );
          continue;
        }

        authoritativeEmployeeIds.add(employeeId);
        try {
          await _upsertEmployee(emp, currentCompanyId: currentCompanyId);
          syncedCount++;
        } catch (e) {
          failedCount++;
          _logger.w('Failed to upsert employee $employeeId: $e');
        }
      }

      if (snapshot != null) {
        snapshot.employeeIds
          ..clear()
          ..addAll(authoritativeEmployeeIds);
      }

      final success = failedCount == 0;
      _logger.i(
        'Synced $syncedCount employees to local database '
        '(failed: $failedCount, skipped_out_of_scope: $skippedOutOfScopeCount, scope: ${permittedDivisionIds.length} divisions)',
      );
      return SyncItemResult(
        success: success,
        count: syncedCount,
        latestCursor: success ? latestUpdatedAt : null,
        mode: 'full',
        error: success
            ? null
            : 'Sebagian data karyawan gagal disimpan ($failedCount gagal). '
                  'Silakan ulangi sinkronisasi.',
      );
    } catch (e) {
      _logger.e('Error syncing employees: $e');
      return SyncItemResult(
        success: false,
        count: 0,
        error: SyncErrorMessageHelper.toUserMessage(
          e,
          action: 'sinkronisasi data karyawan',
        ),
      );
    }
  }

  Future<SyncItemResult> _syncEmployeesIncrementalInternal({
    required DateTime since,
    String? divisionId,
  }) async {
    _logger.i('Syncing employees incrementally from server since $since...');

    try {
      final hasValidAuth = await _ensureAuthWithTier();
      if (!hasValidAuth) {
        _logger.w(_reloginMessage);
        return SyncItemResult(
          success: false,
          count: 0,
          error: _reloginMessage,
          mode: 'incremental',
        );
      }

      final normalizedDivisionId = divisionId?.trim();
      final assignedDivisionIds = await _getAssignedDivisionIds();
      if (assignedDivisionIds.isEmpty) {
        const message =
            'Assignment divisi mandor tidak ditemukan. Silakan login ulang atau hubungi admin.';
        _logger.w(message);
        return SyncItemResult(success: false, count: 0, error: message);
      }

      if (normalizedDivisionId != null &&
          normalizedDivisionId.isNotEmpty &&
          !assignedDivisionIds.contains(normalizedDivisionId)) {
        const message =
            'Divisi yang diminta berada di luar assignment mandor. Sinkronisasi dibatalkan.';
        _logger.w(
          '$message requestedDivisionId=$normalizedDivisionId assigned=$assignedDivisionIds',
        );
        return SyncItemResult(success: false, count: 0, error: message);
      }

      final permittedDivisionIds =
          normalizedDivisionId != null && normalizedDivisionId.isNotEmpty
          ? <String>{normalizedDivisionId}
          : assignedDivisionIds;

      final options = QueryOptions(
        document: gql(MandorMasterSyncQueries.getEmployeesIncremental),
        variables: _cleanVariables({
          'divisionId': normalizedDivisionId,
          'updatedSince': since.toIso8601String(),
        }),
        fetchPolicy: FetchPolicy.networkOnly,
      );

      final result = await _graphqlClient.query(options);

      if (result.hasException) {
        _logger.e(
          'GraphQL Error syncing employees incrementally: ${result.exception}',
        );
        return SyncItemResult(
          success: false,
          count: 0,
          error: SyncErrorMessageHelper.toUserMessage(
            result.exception!,
            action: 'sinkronisasi incremental data karyawan',
          ),
          mode: 'incremental',
        );
      }

      final employees =
          result.data?['mandorEmployeesSync'] as List<dynamic>? ?? [];
      final latestUpdatedAt = _extractLatestUpdatedAt(employees);
      _logger.i('Received ${employees.length} incremental employees from server');

      final currentCompanyId = await _getCurrentCompanyId();
      if (currentCompanyId == null || currentCompanyId.isEmpty) {
        return SyncItemResult(
          success: false,
          count: 0,
          error: 'Company user login tidak ditemukan. Silakan login ulang.',
          mode: 'incremental',
        );
      }

      int syncedCount = 0;
      int failedCount = 0;
      int skippedOutOfScopeCount = 0;

      for (final employee in employees) {
        final employeeId = employee['id']?.toString().trim() ?? '';
        final employeeDivisionId =
            employee['divisionId']?.toString().trim() ?? '';
        if (employeeId.isEmpty) {
          failedCount++;
          _logger.w('Skip incremental employee payload without id: $employee');
          continue;
        }

        if (!_isValidUuid(employeeId)) {
          failedCount++;
          _logger.w(
            'Skip incremental employee payload with invalid UUID: $employeeId',
          );
          continue;
        }

        if (employeeDivisionId.isEmpty ||
            !permittedDivisionIds.contains(employeeDivisionId)) {
          skippedOutOfScopeCount++;
          _logger.w(
            'Skipping out-of-scope incremental employee payload '
            'employee_id=$employeeId division_id=$employeeDivisionId',
          );
          continue;
        }

        try {
          await _upsertEmployee(
            Map<String, dynamic>.from(employee as Map),
            currentCompanyId: currentCompanyId,
          );
          syncedCount++;
        } catch (e) {
          failedCount++;
          _logger.w(
            'Failed to upsert incremental employee $employeeId: $e',
          );
        }
      }

      final success = failedCount == 0;
      _logger.i(
        'Incremental employees sync stored $syncedCount rows '
        '(failed: $failedCount, skipped_out_of_scope: $skippedOutOfScopeCount)',
      );

      return SyncItemResult(
        success: success,
        count: syncedCount,
        latestCursor: success ? latestUpdatedAt : null,
        mode: 'incremental',
        error: success
            ? null
            : 'Sebagian perubahan data karyawan gagal disimpan ($failedCount gagal). '
                  'Silakan ulangi sinkronisasi.',
      );
    } catch (e) {
      _logger.e('Error syncing employees incrementally: $e');
      return SyncItemResult(
        success: false,
        count: 0,
        error: SyncErrorMessageHelper.toUserMessage(
          e,
          action: 'sinkronisasi incremental data karyawan',
        ),
        mode: 'incremental',
      );
    }
  }

  /// Sync blocks from server to local SQLite
  Future<SyncItemResult> syncBlocks({String? divisionId}) async {
    return _syncBlocksInternal(null, divisionId: divisionId);
  }

  Future<SyncItemResult> _syncBlocksInternal(
    _MasterSyncScopeSnapshot? snapshot, {
    String? divisionId,
  }) async {
    _logger.i('Syncing blocks from server...');

    try {
      final hasValidAuth = await _ensureAuthWithTier();
      if (!hasValidAuth) {
        _logger.w(_reloginMessage);
        return SyncItemResult(success: false, count: 0, error: _reloginMessage);
      }

      final normalizedDivisionId = divisionId?.trim();
      final assignedDivisionIds = snapshot != null && snapshot.divisionIds.isNotEmpty
          ? Set<String>.from(snapshot.divisionIds)
          : await _getAssignedDivisionIds();
      if (assignedDivisionIds.isEmpty) {
        const message =
            'Assignment divisi mandor tidak ditemukan. Silakan login ulang atau hubungi admin.';
        _logger.w(message);
        return SyncItemResult(
          success: false,
          count: 0,
          error: message,
          mode: 'incremental',
        );
      }

      if (normalizedDivisionId != null &&
          normalizedDivisionId.isNotEmpty &&
          !assignedDivisionIds.contains(normalizedDivisionId)) {
        const message =
            'Divisi yang diminta berada di luar assignment mandor. Sinkronisasi dibatalkan.';
        _logger.w(
          '$message requestedDivisionId=$normalizedDivisionId assigned=$assignedDivisionIds',
        );
        return SyncItemResult(
          success: false,
          count: 0,
          error: message,
          mode: 'incremental',
        );
      }

      final permittedDivisionIds =
          normalizedDivisionId != null && normalizedDivisionId.isNotEmpty
          ? <String>{normalizedDivisionId}
          : assignedDivisionIds;

      final QueryOptions options = QueryOptions(
        document: gql(MandorMasterSyncQueries.getBlocks),
        variables: _cleanVariables({'divisionId': normalizedDivisionId}),
        fetchPolicy: FetchPolicy.networkOnly,
      );

      final result = await _graphqlClient.query(options);

      if (result.hasException) {
        _logger.e('GraphQL Error syncing blocks: ${result.exception}');
        return SyncItemResult(
          success: false,
          count: 0,
          error: SyncErrorMessageHelper.toUserMessage(
            result.exception!,
            action: 'sinkronisasi data blok',
          ),
        );
      }

      final blocks = result.data?['mandorBlocks'] as List<dynamic>? ?? [];
      final latestUpdatedAt = _extractLatestUpdatedAt(blocks);
      _logger.i('Received ${blocks.length} blocks from server');
      if (snapshot != null) {
        snapshot.blocksFetched = true;
      }

      int syncedCount = 0;
      int failedCount = 0;
      int skippedOutOfScopeCount = 0;
      final authoritativeBlockIds = <String>{};
      for (var block in blocks) {
        final blockId = block['id']?.toString().trim() ?? '';
        final blockDivisionId = block['divisionId']?.toString().trim() ?? '';
        if (blockId.isEmpty) {
          failedCount++;
          _logger.w('Skip block payload without id: $block');
          continue;
        }

        if (!_isValidUuid(blockId)) {
          failedCount++;
          _logger.w('Skip block payload with invalid UUID: $blockId');
          continue;
        }

        if (blockDivisionId.isEmpty ||
            !permittedDivisionIds.contains(blockDivisionId)) {
          skippedOutOfScopeCount++;
          _logger.w(
            'Skipping out-of-scope block payload '
            'block_id=$blockId division_id=$blockDivisionId',
          );
          continue;
        }

        authoritativeBlockIds.add(blockId);
        try {
          await _upsertBlock(block);
          syncedCount++;
        } catch (e) {
          failedCount++;
          _logger.w('Failed to upsert block $blockId: $e');
        }
      }

      if (snapshot != null) {
        snapshot.blockIds
          ..clear()
          ..addAll(authoritativeBlockIds);
      }

      final success = failedCount == 0;
      _logger.i(
        'Synced $syncedCount blocks to local database '
        '(failed: $failedCount, skipped_out_of_scope: $skippedOutOfScopeCount, scope: ${permittedDivisionIds.length} divisions)',
      );
      return SyncItemResult(
        success: success,
        count: syncedCount,
        latestCursor: success ? latestUpdatedAt : null,
        mode: 'full',
        error: success
            ? null
            : 'Sebagian data blok gagal disimpan ($failedCount gagal). '
                  'Silakan ulangi sinkronisasi.',
      );
    } catch (e) {
      _logger.e('Error syncing blocks: $e');
      return SyncItemResult(
        success: false,
        count: 0,
        error: SyncErrorMessageHelper.toUserMessage(
          e,
          action: 'sinkronisasi data blok',
        ),
      );
    }
  }

  Future<SyncItemResult> _syncBlocksIncrementalInternal({
    required DateTime since,
    String? divisionId,
  }) async {
    _logger.i('Syncing blocks incrementally from server since $since...');

    try {
      final hasValidAuth = await _ensureAuthWithTier();
      if (!hasValidAuth) {
        _logger.w(_reloginMessage);
        return SyncItemResult(
          success: false,
          count: 0,
          error: _reloginMessage,
          mode: 'incremental',
        );
      }

      final normalizedDivisionId = divisionId?.trim();
      final assignedDivisionIds = await _getAssignedDivisionIds();
      if (assignedDivisionIds.isEmpty) {
        const message =
            'Assignment divisi mandor tidak ditemukan. Silakan login ulang atau hubungi admin.';
        _logger.w(message);
        return SyncItemResult(success: false, count: 0, error: message);
      }

      if (normalizedDivisionId != null &&
          normalizedDivisionId.isNotEmpty &&
          !assignedDivisionIds.contains(normalizedDivisionId)) {
        const message =
            'Divisi yang diminta berada di luar assignment mandor. Sinkronisasi dibatalkan.';
        _logger.w(
          '$message requestedDivisionId=$normalizedDivisionId assigned=$assignedDivisionIds',
        );
        return SyncItemResult(success: false, count: 0, error: message);
      }

      final permittedDivisionIds =
          normalizedDivisionId != null && normalizedDivisionId.isNotEmpty
          ? <String>{normalizedDivisionId}
          : assignedDivisionIds;

      final options = QueryOptions(
        document: gql(MandorMasterSyncQueries.getBlocksIncremental),
        variables: _cleanVariables({
          'divisionId': normalizedDivisionId,
          'updatedSince': since.toIso8601String(),
        }),
        fetchPolicy: FetchPolicy.networkOnly,
      );

      final result = await _graphqlClient.query(options);

      if (result.hasException) {
        _logger.e(
          'GraphQL Error syncing blocks incrementally: ${result.exception}',
        );
        return SyncItemResult(
          success: false,
          count: 0,
          error: SyncErrorMessageHelper.toUserMessage(
            result.exception!,
            action: 'sinkronisasi incremental data blok',
          ),
          mode: 'incremental',
        );
      }

      final blocks = result.data?['mandorBlocksSync'] as List<dynamic>? ?? [];
      final latestUpdatedAt = _extractLatestUpdatedAt(blocks);
      _logger.i('Received ${blocks.length} incremental blocks from server');

      int syncedCount = 0;
      int failedCount = 0;
      int skippedOutOfScopeCount = 0;

      for (final block in blocks) {
        final blockId = block['id']?.toString().trim() ?? '';
        final blockDivisionId = block['divisionId']?.toString().trim() ?? '';
        if (blockId.isEmpty) {
          failedCount++;
          _logger.w('Skip incremental block payload without id: $block');
          continue;
        }

        if (!_isValidUuid(blockId)) {
          failedCount++;
          _logger.w('Skip incremental block payload with invalid UUID: $blockId');
          continue;
        }

        if (blockDivisionId.isEmpty ||
            !permittedDivisionIds.contains(blockDivisionId)) {
          skippedOutOfScopeCount++;
          _logger.w(
            'Skipping out-of-scope incremental block payload '
            'block_id=$blockId division_id=$blockDivisionId',
          );
          continue;
        }

        try {
          await _upsertBlock(Map<String, dynamic>.from(block as Map));
          syncedCount++;
        } catch (e) {
          failedCount++;
          _logger.w('Failed to upsert incremental block $blockId: $e');
        }
      }

      final success = failedCount == 0;
      _logger.i(
        'Incremental blocks sync stored $syncedCount rows '
        '(failed: $failedCount, skipped_out_of_scope: $skippedOutOfScopeCount)',
      );

      return SyncItemResult(
        success: success,
        count: syncedCount,
        latestCursor: success ? latestUpdatedAt : null,
        mode: 'incremental',
        error: success
            ? null
            : 'Sebagian perubahan data blok gagal disimpan ($failedCount gagal). '
                  'Silakan ulangi sinkronisasi.',
      );
    } catch (e) {
      _logger.e('Error syncing blocks incrementally: $e');
      return SyncItemResult(
        success: false,
        count: 0,
        error: SyncErrorMessageHelper.toUserMessage(
          e,
          action: 'sinkronisasi incremental data blok',
        ),
        mode: 'incremental',
      );
    }
  }

  /// Pull harvest updates from server (approved/rejected status)
  Future<SyncItemResult> pullHarvestUpdates() async {
    _logger.i('Pulling harvest updates from server...');

    try {
      final hasValidAuth = await _ensureAuthWithTier();
      if (!hasValidAuth) {
        _logger.w(_reloginMessage);
        return SyncItemResult(success: false, count: 0, error: _reloginMessage);
      }

      final currentMandorId =
          (await UnifiedSecureStorageService.getCurrentUserId())?.trim() ?? '';
      if (currentMandorId.isEmpty) {
        const message = 'Sesi mandor tidak ditemukan. Silakan login ulang.';
        _logger.w(message);
        return SyncItemResult(success: false, count: 0, error: message);
      }

      // Get last sync timestamp (scoped per mandor)
      final lastSyncAt = await _getLastHarvestSyncTimestamp(currentMandorId);
      final deviceId = await _getDeviceId();

      final QueryOptions options = QueryOptions(
        document: gql(MandorMasterSyncQueries.getServerUpdates),
        variables: {
          'since': lastSyncAt.toIso8601String(),
          'deviceId': deviceId,
        },
        fetchPolicy: FetchPolicy.networkOnly,
      );

      final result = await _graphqlClient.query(options);

      if (result.hasException) {
        _logger.e('GraphQL Error pulling harvest updates: ${result.exception}');
        return SyncItemResult(
          success: false,
          count: 0,
          error: SyncErrorMessageHelper.toUserMessage(
            result.exception!,
            action: 'pengambilan update status panen',
          ),
        );
      }

      final updates =
          result.data?['mandorServerUpdates'] as List<dynamic>? ?? [];
      _logger.i('Received ${updates.length} harvest updates from server');
      if (updates.isEmpty) {
        await _saveLastHarvestSyncTimestamp(currentMandorId, DateTime.now());
        return SyncItemResult(success: true, count: 0);
      }

      int updatedCount = 0;
      int skippedCount = 0;
      for (var update in updates) {
        try {
          final didUpdate = await _updateLocalHarvestStatus(update);
          if (didUpdate) {
            updatedCount++;
          } else {
            skippedCount++;
            _logger.d(
              'No local harvest row matched server update id=${update['id']} localId=${update['localId']}',
            );
          }
        } catch (e) {
          skippedCount++;
          _logger.w('Failed to update harvest ${update['id']}: $e');
        }
      }

      // Save last sync timestamp only when all updates are safely applied.
      if (skippedCount == 0) {
        await _saveLastHarvestSyncTimestamp(currentMandorId, DateTime.now());
      } else {
        _logger.w(
          'Keeping harvest pull cursor unchanged because $skippedCount updates were not applied',
        );
      }

      _logger.i(
        'Updated $updatedCount harvest records from server (skipped: $skippedCount)',
      );
      return SyncItemResult(
        success: skippedCount == 0,
        count: updatedCount,
        error: skippedCount == 0
            ? null
            : 'Sebagian update status panen belum diterapkan ($skippedCount data). '
                  'Silakan sinkron ulang.',
      );
    } catch (e) {
      _logger.e('Error pulling harvest updates: $e');
      return SyncItemResult(
        success: false,
        count: 0,
        error: SyncErrorMessageHelper.toUserMessage(
          e,
          action: 'pengambilan update status panen',
        ),
      );
    }
  }

  // Private helper methods

  Future<void> _upsertEmployee(
    Map<String, dynamic> emp, {
    required String currentCompanyId,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final employeeId = emp['id']?.toString() ?? '';
    final nik = emp['nik']?.toString().trim() ?? '';
    final employeeCode = nik.isNotEmpty ? nik : employeeId;
    final divisionId = emp['divisionId']?.toString().trim();
    final payloadCompanyId = emp['companyId']?.toString().trim() ?? '';
    final resolvedCompanyId = payloadCompanyId.isNotEmpty
        ? payloadCompanyId
        : currentCompanyId.trim();

    if (resolvedCompanyId.isEmpty) {
      throw Exception(
        'Invalid employee payload: companyId kosong untuk employee_id=$employeeId',
      );
    }

    if (resolvedCompanyId != currentCompanyId.trim()) {
      throw Exception(
        'Tenant mismatch employee_id=$employeeId: payload companyId=$resolvedCompanyId, user companyId=${currentCompanyId.trim()}',
      );
    }

    // Check if employee exists using employee_id (UUID)
    final employeeIdBytes = uuidToBytes(employeeId);
    final existing = await _databaseService.query(
      'employees',
      where: 'employee_id = ?',
      whereArgs: [employeeIdBytes],
    );

    final employeeData = {
      'employee_id': employeeIdBytes, // UUID from server (BLOB)
      'company_id': resolvedCompanyId,
      'division_id': (divisionId != null && divisionId.isNotEmpty)
          ? divisionId
          : null,
      'employee_code': employeeCode, // NIK preferred, fallback to UUID
      'full_name': emp['name'] ?? '',
      'position': emp['role'] ?? '',
      'is_active': _toSqliteActiveFlag(emp['isActive']),
      'updated_at': now,
      'sync_status': 'SYNCED',
      'synced_at': now,
    };

    if (existing.isEmpty) {
      employeeData['created_at'] = now;
      await _databaseService.insert('employees', employeeData);
    } else {
      await _databaseService.update(
        'employees',
        employeeData,
        where: 'employee_id = ?',
        whereArgs: [employeeIdBytes],
      );
    }
  }

  Future<void> _upsertCompany(Map<String, dynamic> company) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final companyId = company['id']?.toString().trim() ?? '';
    if (companyId.isEmpty) {
      return;
    }

    final existing = await _databaseService.query(
      'companies',
      where: 'company_id = ?',
      whereArgs: [companyId],
    );

    final companyName = company['name']?.toString().trim();
    final companyCode = company['code']?.toString().trim();
    final companyData = {
      'company_id': companyId,
      'code': (companyCode != null && companyCode.isNotEmpty)
          ? companyCode
          : _fallbackCodeFromId(companyId),
      'name': (companyName != null && companyName.isNotEmpty)
          ? companyName
          : 'Unknown Company',
      'is_active': _toSqliteActiveFlag(company['isActive']),
      'updated_at': now,
      'sync_status': 'SYNCED',
      'synced_at': now,
    };

    if (existing.isEmpty) {
      companyData['created_at'] = now;
      await _databaseService.insert('companies', companyData);
    } else {
      await _databaseService.update(
        'companies',
        companyData,
        where: 'company_id = ?',
        whereArgs: [companyId],
      );
    }
  }

  Future<void> _upsertEstate(Map<String, dynamic> estate) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final estateId = estate['id']?.toString().trim() ?? '';
    final companyId = estate['companyId']?.toString().trim() ?? '';
    if (estateId.isEmpty || companyId.isEmpty) {
      return;
    }

    await _ensureCompanyExists(companyId);

    final existing = await _databaseService.query(
      'estates',
      where: 'estate_id = ?',
      whereArgs: [estateId],
    );

    final estateName = estate['name']?.toString().trim();
    final estateCode = estate['code']?.toString().trim();
    final estateData = {
      'estate_id': estateId,
      'company_id': companyId,
      'code': (estateCode != null && estateCode.isNotEmpty)
          ? estateCode
          : _fallbackCodeFromId(estateId),
      'name': (estateName != null && estateName.isNotEmpty)
          ? estateName
          : 'Unknown Estate',
      'area_hectares': _toNullableDouble(estate['luasHa']),
      'is_active': _toSqliteActiveFlag(estate['isActive']),
      'updated_at': now,
      'sync_status': 'SYNCED',
      'synced_at': now,
    };

    if (existing.isEmpty) {
      estateData['created_at'] = now;
      await _databaseService.insert('estates', estateData);
    } else {
      await _databaseService.update(
        'estates',
        estateData,
        where: 'estate_id = ?',
        whereArgs: [estateId],
      );
    }
  }

  Future<void> _upsertDivision(Map<String, dynamic> division) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final divisionId = division['id']?.toString().trim() ?? '';
    final estateId = division['estateId']?.toString().trim() ?? '';
    if (divisionId.isEmpty || estateId.isEmpty) {
      return;
    }

    final estateRows = await _databaseService.query(
      'estates',
      where: 'estate_id = ?',
      whereArgs: [estateId],
      limit: 1,
    );
    if (estateRows.isEmpty) {
      final companyId = await _getCurrentCompanyId();
      if (companyId == null || companyId.isEmpty) {
        _logger.w(
          'Skip division upsert because estate parent is missing and company context is unavailable. division_id=$divisionId',
        );
        return;
      }
      await _ensureEstateExists(estateId, companyId);
    }

    final existing = await _databaseService.query(
      'divisions',
      where: 'division_id = ?',
      whereArgs: [divisionId],
    );

    final divisionName = division['name']?.toString().trim();
    final divisionCode = division['code']?.toString().trim();
    final divisionData = {
      'division_id': divisionId,
      'estate_id': estateId,
      'code': (divisionCode != null && divisionCode.isNotEmpty)
          ? divisionCode
          : _fallbackCodeFromId(divisionId),
      'name': (divisionName != null && divisionName.isNotEmpty)
          ? divisionName
          : 'Unknown Division',
      'is_active': _toSqliteActiveFlag(division['isActive']),
      'updated_at': now,
      'sync_status': 'SYNCED',
      'synced_at': now,
    };

    if (existing.isEmpty) {
      divisionData['created_at'] = now;
      await _databaseService.insert('divisions', divisionData);
    } else {
      await _databaseService.update(
        'divisions',
        divisionData,
        where: 'division_id = ?',
        whereArgs: [divisionId],
      );
    }
  }

  Future<void> _upsertBlock(Map<String, dynamic> block) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final blockIdBytes = uuidToBytes(block['id']?.toString() ?? '');

    final existing = await _databaseService.query(
      'blocks',
      where: 'block_id = ?',
      whereArgs: [blockIdBytes],
    );

    final blockData = {
      'block_id': blockIdBytes, // UUID from server (BLOB)
      'division_id': block['divisionId'] ?? '',
      'code': block['blockCode'] ?? '',
      'name': block['name'] ?? '',
      'area_hectares': (block['luasHa'] as num?)
          ?.toDouble(), // Mapped to area_hectares
      'planting_year': block['plantingYear'],
      'variety_type': block['cropType'],
      'is_active': _toSqliteActiveFlag(block['isActive']),
      'updated_at': now,
      'sync_status': 'SYNCED',
      'synced_at': now,
    };

    if (existing.isEmpty) {
      blockData['created_at'] = now;
      await _databaseService.insert('blocks', blockData);
    } else {
      await _databaseService.update(
        'blocks',
        blockData,
        where: 'block_id = ?',
        whereArgs: [blockIdBytes],
      );
    }
  }

  Future<bool> _updateLocalHarvestStatus(Map<String, dynamic> update) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final currentMandorId =
        (await UnifiedSecureStorageService.getCurrentUserId())?.trim() ?? '';
    if (currentMandorId.isEmpty) {
      _logger.w(
        'Skip local harvest status update: current mandor session not found',
      );
      return false;
    }

    // Match using sync identities:
    // - server_id (authoritative after first successful push)
    // - harvest_id (local ID generated on device)
    final serverId = update['id']?.toString().trim() ?? '';
    final localId = update['localId']?.toString().trim() ?? '';

    final whereParts = <String>[];
    final whereArgs = <dynamic>[currentMandorId];
    if (localId.isNotEmpty) {
      whereParts.add('harvest_id = ?');
      whereArgs.add(localId);
    }
    if (serverId.isNotEmpty) {
      whereParts.add('server_id = ?');
      whereArgs.add(serverId);
    }

    if (whereParts.isEmpty) {
      _logger.w('Skip server update without id/localId: $update');
      return false;
    }

    DateTime? approvalDateTime;
    final approvedAtRaw = update['approvedAt'];
    if (approvedAtRaw != null) {
      try {
        approvalDateTime = DateTime.parse(approvedAtRaw.toString());
      } catch (_) {
        // Keep nullable when payload is malformed; status update still applies.
      }
    }

    final harvestData = {
      'status': update['status'],
      'approved_by_id': update['approvedBy'],
      'approval_date': approvalDateTime?.millisecondsSinceEpoch,
      'rejection_reason': update['rejectedReason'],
      'sync_status': 'SYNCED',
      'needs_sync': 0,
      'synced_at': now,
      'updated_at': now,
    };

    final updated = await _databaseService.update(
      'harvest_records',
      harvestData,
      where: 'mandor_id = ? AND (${whereParts.join(' OR ')})',
      whereArgs: whereArgs,
    );
    return updated > 0;
  }

  Future<String?> _getCurrentMandorIdOrNull() async {
    final mandorId = (await UnifiedSecureStorageService.getCurrentUserId())
        ?.trim();
    if (mandorId == null || mandorId.isEmpty) {
      return null;
    }
    return mandorId;
  }

  String _buildAssignmentFingerprintKey(String mandorId) {
    return 'mandor_assignment_fingerprint:$mandorId';
  }

  String _buildDivisionsLastFullSyncKey(String mandorId) {
    return 'mandor_master_divisions_last_full_sync_at:$mandorId';
  }

  String _buildDivisionsCursorKey(String mandorId) {
    return 'mandor_master_divisions_cursor:$mandorId';
  }

  String _buildBlocksLastFullSyncKey(String mandorId) {
    return 'mandor_master_blocks_last_full_sync_at:$mandorId';
  }

  String _buildBlocksCursorKey(String mandorId) {
    return 'mandor_master_blocks_cursor:$mandorId';
  }

  String _buildEmployeesLastFullSyncKey(String mandorId) {
    return 'mandor_master_employees_last_full_sync_at:$mandorId';
  }

  String _buildEmployeesCursorKey(String mandorId) {
    return 'mandor_master_employees_cursor:$mandorId';
  }

  Future<String> _buildAssignmentFingerprint() async {
    final divisionIds = await _getAssignedDivisionIds();
    if (divisionIds.isEmpty) {
      return '';
    }

    final sortedDivisionIds = divisionIds.toList()..sort();
    return sortedDivisionIds.join('|');
  }

  Future<String?> _readSetting(String key) async {
    try {
      final settings = await _databaseService.query(
        'app_settings',
        where: 'key = ?',
        whereArgs: [key],
        limit: 1,
      );
      if (settings.isEmpty) {
        return null;
      }

      final value = settings.first['value'];
      if (value == null) {
        return null;
      }

      final normalized = value.toString().trim();
      return normalized.isEmpty ? null : normalized;
    } catch (e) {
      _logger.w('Failed to read app setting key=$key: $e');
      return null;
    }
  }

  Future<void> _writeSetting(
    String key,
    String value, {
    required String description,
    String type = 'STRING',
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;

    try {
      final existing = await _databaseService.query(
        'app_settings',
        where: 'key = ?',
        whereArgs: [key],
        limit: 1,
      );

      if (existing.isEmpty) {
        await _databaseService.insert('app_settings', {
          'key': key,
          'value': value,
          'type': type,
          'description': description,
          'created_at': now,
          'updated_at': now,
        });
      } else {
        await _databaseService.update(
          'app_settings',
          {
            'value': value,
            'type': type,
            'description': description,
            'updated_at': now,
          },
          where: 'key = ?',
          whereArgs: [key],
        );
      }
    } catch (e) {
      _logger.w('Failed to write app setting key=$key: $e');
    }
  }

  Future<DateTime?> _readDateTimeSetting(String key) async {
    final value = await _readSetting(key);
    if (value == null) {
      return null;
    }

    try {
      return DateTime.parse(value).toUtc();
    } catch (e) {
      _logger.w('Failed to parse datetime app setting key=$key value=$value: $e');
      return null;
    }
  }

  Future<void> _writeDateTimeSetting(
    String key,
    DateTime value, {
    required String description,
  }) async {
    await _writeSetting(
      key,
      value.toUtc().toIso8601String(),
      description: description,
    );
  }

  Future<void> _persistSyncMetadata({
    required String mandorId,
    required String cursorKey,
    required String cursorDescription,
    DateTime? cursor,
    required String lastFullKey,
    required String lastFullDescription,
    DateTime? lastFullAt,
  }) async {
    if (cursor != null) {
      await _writeDateTimeSetting(
        cursorKey,
        cursor,
        description: cursorDescription,
      );
    }

    if (lastFullAt != null) {
      await _writeDateTimeSetting(
        lastFullKey,
        lastFullAt,
        description: lastFullDescription,
      );
    }

    _logger.d(
      'Persisted sync metadata for mandor=$mandorId cursorKey=$cursorKey '
      'cursor=$cursor lastFullKey=$lastFullKey lastFullAt=$lastFullAt',
    );
  }

  DateTime? _extractLatestUpdatedAt(List<dynamic> items) {
    DateTime? latest;

    for (final item in items) {
      if (item is! Map) {
        continue;
      }

      final updatedAtRaw = item['updatedAt'];
      if (updatedAtRaw == null) {
        continue;
      }

      try {
        final parsed = DateTime.parse(updatedAtRaw.toString()).toUtc();
        if (latest == null || parsed.isAfter(latest)) {
          latest = parsed;
        }
      } catch (_) {
        continue;
      }
    }

    return latest;
  }

  DateTime? _extractLatestUpdatedAtFromGroups(List<List<dynamic>> groups) {
    DateTime? latest;

    for (final group in groups) {
      final groupLatest = _extractLatestUpdatedAt(group);
      if (groupLatest == null) {
        continue;
      }

      if (latest == null || groupLatest.isAfter(latest)) {
        latest = groupLatest;
      }
    }

    return latest;
  }

  String _buildLastHarvestSyncKey(String mandorId) {
    return 'last_harvest_sync_at:$mandorId';
  }

  Future<DateTime> _getLastHarvestSyncTimestamp(String mandorId) async {
    try {
      final scopedKey = _buildLastHarvestSyncKey(mandorId);

      final settings = await _databaseService.query(
        'app_settings',
        where: 'key = ?',
        whereArgs: [scopedKey],
      );

      if (settings.isNotEmpty) {
        final value = settings.first['value'] as String?;
        if (value != null) {
          return DateTime.parse(value);
        }
      }

      // Backward compatibility for older builds using global key.
      final legacy = await _databaseService.query(
        'app_settings',
        where: 'key = ?',
        whereArgs: ['last_harvest_sync_at'],
      );
      if (legacy.isNotEmpty) {
        final value = legacy.first['value'] as String?;
        if (value != null) {
          return DateTime.parse(value);
        }
      }
    } catch (e) {
      _logger.d('No last sync timestamp found, using default');
    }

    // Default: 30 days ago
    return DateTime.now().subtract(const Duration(days: 30));
  }

  Future<void> _saveLastHarvestSyncTimestamp(
    String mandorId,
    DateTime timestamp,
  ) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final scopedKey = _buildLastHarvestSyncKey(mandorId);

    try {
      final existing = await _databaseService.query(
        'app_settings',
        where: 'key = ?',
        whereArgs: [scopedKey],
      );

      if (existing.isEmpty) {
        await _databaseService.insert('app_settings', {
          'key': scopedKey,
          'value': timestamp.toIso8601String(),
          'type': 'STRING',
          'description': 'Last harvest sync timestamp for mandor $mandorId',
          'created_at': now,
          'updated_at': now,
        });
      } else {
        await _databaseService.update(
          'app_settings',
          {'value': timestamp.toIso8601String(), 'updated_at': now},
          where: 'key = ?',
          whereArgs: [scopedKey],
        );
      }
    } catch (e) {
      _logger.w('Failed to save last sync timestamp: $e');
    }
  }

  Future<String> _getDeviceId() async {
    return DeviceService.getDeviceId();
  }

  Future<int> _deactivateOutOfScopeDivisions(Set<String> activeDivisionIds) async {
    if (activeDivisionIds.isEmpty) {
      _logger.w(
        'Skip division deactivation because no active assignment divisions were resolved',
      );
      return 0;
    }

    final db = await _databaseService.database;
    final now = DateTime.now().millisecondsSinceEpoch;
    final placeholders = List.filled(activeDivisionIds.length, '?').join(', ');
    final updatedCount = await db.rawUpdate(
      '''
      UPDATE divisions
      SET is_active = ?, updated_at = ?, sync_status = ?, synced_at = ?
      WHERE is_active = 1 AND division_id NOT IN ($placeholders)
      ''',
      <dynamic>[0, now, 'SYNCED', now, ...activeDivisionIds],
    );
    _logger.i('Division reconciliation deactivated $updatedCount rows');
    return updatedCount;
  }

  Future<int> _deactivateOutOfScopeEmployees(
    Set<String> activeDivisionIds,
    Set<String> syncedEmployeeIds,
  ) async {
    if (activeDivisionIds.isEmpty) {
      _logger.w(
        'Skip employee deactivation because no active assignment divisions were resolved',
      );
      return 0;
    }

    final currentCompanyId = await _getCurrentCompanyId();
    if (currentCompanyId == null || currentCompanyId.isEmpty) {
      _logger.w(
        'Skip employee deactivation because current company context is unavailable',
      );
      return 0;
    }

    final db = await _databaseService.database;
    final now = DateTime.now().millisecondsSinceEpoch;
    final divisionPlaceholders = List.filled(activeDivisionIds.length, '?').join(
      ', ',
    );
    final args = <dynamic>[0, now, 'SYNCED', now, currentCompanyId];
    final conditions = <String>[
      "(division_id IS NULL OR TRIM(division_id) = '' OR division_id NOT IN ($divisionPlaceholders))",
    ];
    args.addAll(activeDivisionIds);

    if (syncedEmployeeIds.isEmpty) {
      conditions.add('division_id IN ($divisionPlaceholders)');
      args.addAll(activeDivisionIds);
    } else {
      final employeePlaceholders = List.filled(
        syncedEmployeeIds.length,
        '?',
      ).join(', ');
      conditions.add(
        '(division_id IN ($divisionPlaceholders) AND employee_id NOT IN ($employeePlaceholders))',
      );
      args.addAll(activeDivisionIds);
      args.addAll(syncedEmployeeIds.map(uuidToBytes));
    }

    final updatedCount = await db.rawUpdate(
      '''
      UPDATE employees
      SET is_active = ?, updated_at = ?, sync_status = ?, synced_at = ?
      WHERE company_id = ? AND is_active = 1 AND (${conditions.join(' OR ')})
      ''',
      args,
    );
    _logger.i(
      'Employee reconciliation deactivated $updatedCount rows '
      '(scope: ${activeDivisionIds.length} divisions, authoritative: ${syncedEmployeeIds.length} employees)',
    );
    return updatedCount;
  }

  Future<int> _deactivateOutOfScopeBlocks(
    Set<String> activeDivisionIds,
    Set<String> syncedBlockIds,
  ) async {
    if (activeDivisionIds.isEmpty) {
      _logger.w(
        'Skip block deactivation because no active assignment divisions were resolved',
      );
      return 0;
    }

    final db = await _databaseService.database;
    final now = DateTime.now().millisecondsSinceEpoch;
    final divisionPlaceholders = List.filled(activeDivisionIds.length, '?').join(
      ', ',
    );
    final args = <dynamic>[0, now, 'SYNCED', now];
    final conditions = <String>[
      "(division_id IS NULL OR TRIM(division_id) = '' OR division_id NOT IN ($divisionPlaceholders))",
    ];
    args.addAll(activeDivisionIds);

    if (syncedBlockIds.isEmpty) {
      conditions.add('division_id IN ($divisionPlaceholders)');
      args.addAll(activeDivisionIds);
    } else {
      final blockPlaceholders = List.filled(syncedBlockIds.length, '?').join(
        ', ',
      );
      conditions.add(
        '(division_id IN ($divisionPlaceholders) AND block_id NOT IN ($blockPlaceholders))',
      );
      args.addAll(activeDivisionIds);
      args.addAll(syncedBlockIds.map(uuidToBytes));
    }

    final updatedCount = await db.rawUpdate(
      '''
      UPDATE blocks
      SET is_active = ?, updated_at = ?, sync_status = ?, synced_at = ?
      WHERE is_active = 1 AND (${conditions.join(' OR ')})
      ''',
      args,
    );
    _logger.i(
      'Block reconciliation deactivated $updatedCount rows '
      '(scope: ${activeDivisionIds.length} divisions, authoritative: ${syncedBlockIds.length} blocks)',
    );
    return updatedCount;
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
        'Mandor master sync auth: access token expired/near expiry, trying refresh tiers...',
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
        _logger.i('Mandor master sync auth: refreshToken succeeded');
        return true;
      } catch (e) {
        _logger.w('Mandor master sync auth: refreshToken failed: $e');
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
        _logger.i('Mandor master sync auth: deviceRenew succeeded');
        return true;
      } catch (e) {
        _logger.w('Mandor master sync auth: deviceRenew failed: $e');
      }
    }

    _logger.w('Mandor master sync auth: all auth tiers exhausted');
    return false;
  }
}

/// Result of a master data sync operation
class MasterSyncResult {
  bool success = false;
  String message = '';
  int divisionsSynced = 0;
  bool divisionsSuccess = false;
  String divisionsMode = 'skipped';
  int employeesSynced = 0;
  bool employeesSuccess = false;
  String employeesMode = 'skipped';
  int blocksSynced = 0;
  bool blocksSuccess = false;
  String blocksMode = 'skipped';
}

/// Result of syncing a single item type
class SyncItemResult {
  final bool success;
  final int count;
  final String? error;
  final DateTime? latestCursor;
  final String mode;

  SyncItemResult({
    required this.success,
    required this.count,
    this.error,
    this.latestCursor,
    this.mode = 'full',
  });
}

class _MasterSyncScopeSnapshot {
  final Set<String> divisionIds = <String>{};
  final Set<String> employeeIds = <String>{};
  final Set<String> blockIds = <String>{};
  bool divisionsFetched = false;
  bool employeesFetched = false;
  bool blocksFetched = false;
}

String _composePartialSyncMessage({
  String? divisionError,
  String? employeeError,
  String? blockError,
}) {
  final messages = <String>[
    if (divisionError != null && divisionError.trim().isNotEmpty)
      'Divisi: ${divisionError.trim()}',
    if (employeeError != null && employeeError.trim().isNotEmpty)
      'Karyawan: ${employeeError.trim()}',
    if (blockError != null && blockError.trim().isNotEmpty)
      'Blok: ${blockError.trim()}',
  ];

  if (messages.isEmpty) {
    return 'Sinkronisasi data master belum berhasil. Silakan coba lagi.';
  }

  return 'Sinkronisasi data master belum lengkap. ${messages.join(' | ')}';
}
