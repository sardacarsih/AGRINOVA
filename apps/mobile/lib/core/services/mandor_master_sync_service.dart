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

  MandorMasterSyncService({
    required AgroGraphQLClient graphqlClient,
    required EnhancedDatabaseService databaseService,
  })  : _graphqlClient = graphqlClient,
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

  String _fallbackCodeFromId(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return 'UNKNOWN';
    final maxLength = trimmed.length < 8 ? trimmed.length : 8;
    return trimmed.substring(0, maxLength).toUpperCase();
  }

  Future<String?> _getCurrentCompanyId() async {
    final user = await UnifiedSecureStorageService.getUserInfo();
    final companyId = user?.companyId?.trim();
    if (companyId != null && companyId.isNotEmpty) {
      return companyId;
    }
    return null;
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

  /// Sync all master data (employees and blocks)
  Future<MasterSyncResult> syncAll() async {
    _logger.i('Starting Mandor master data sync...');

    final result = MasterSyncResult();

    try {
      // Sync assignment masters (companies, estates, divisions)
      final divisionResult = await syncDivisions();
      result.divisionsSynced = divisionResult.count;
      result.divisionsSuccess = divisionResult.success;

      // Sync employees
      final employeeResult = await syncEmployees();
      result.employeesSynced = employeeResult.count;
      result.employeesSuccess = employeeResult.success;

      // Sync blocks
      final blockResult = await syncBlocks();
      result.blocksSynced = blockResult.count;
      result.blocksSuccess = blockResult.success;

      result.success = divisionResult.success &&
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

      int companySynced = 0;
      int estateSynced = 0;
      int divisionSynced = 0;

      for (final company in companies) {
        try {
          await _upsertCompany(Map<String, dynamic>.from(company as Map));
          companySynced++;
        } catch (e) {
          _logger.w('Failed to upsert company: $e');
        }
      }

      for (final estate in estates) {
        try {
          await _upsertEstate(Map<String, dynamic>.from(estate as Map));
          estateSynced++;
        } catch (e) {
          _logger.w('Failed to upsert estate: $e');
        }
      }

      for (final division in divisions) {
        try {
          await _upsertDivision(Map<String, dynamic>.from(division as Map));
          divisionSynced++;
        } catch (e) {
          _logger.w('Failed to upsert division: $e');
        }
      }

      _logger.i(
        'Synced assignment masters: $companySynced companies, $estateSynced estates, $divisionSynced divisions',
      );
      return SyncItemResult(success: true, count: divisionSynced);
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

  /// Sync employees from server to local SQLite
  Future<SyncItemResult> syncEmployees(
      {String? divisionId, String? search}) async {
    _logger.i('Syncing employees from server...');

    try {
      final hasValidAuth = await _ensureAuthWithTier();
      if (!hasValidAuth) {
        _logger.w(_reloginMessage);
        return SyncItemResult(success: false, count: 0, error: _reloginMessage);
      }

      final QueryOptions options = QueryOptions(
        document: gql(MandorMasterSyncQueries.getEmployees),
        variables: {
          'divisionId': ?divisionId,
          'search': ?search,
        },
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
      _logger.i('Received ${employees.length} employees from server');

      int syncedCount = 0;
      for (var emp in employees) {
        try {
          await _upsertEmployee(emp);
          syncedCount++;
        } catch (e) {
          _logger.w('Failed to upsert employee ${emp['id']}: $e');
        }
      }

      _logger.i('Synced $syncedCount employees to local database');
      return SyncItemResult(success: true, count: syncedCount);
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

  /// Sync blocks from server to local SQLite
  Future<SyncItemResult> syncBlocks({String? divisionId}) async {
    _logger.i('Syncing blocks from server...');

    try {
      final hasValidAuth = await _ensureAuthWithTier();
      if (!hasValidAuth) {
        _logger.w(_reloginMessage);
        return SyncItemResult(success: false, count: 0, error: _reloginMessage);
      }

      final QueryOptions options = QueryOptions(
        document: gql(MandorMasterSyncQueries.getBlocks),
        variables: {
          'divisionId': ?divisionId,
        },
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
      _logger.i('Received ${blocks.length} blocks from server');

      int syncedCount = 0;
      for (var block in blocks) {
        try {
          await _upsertBlock(block);
          syncedCount++;
        } catch (e) {
          _logger.w('Failed to upsert block ${block['id']}: $e');
        }
      }

      _logger.i('Synced $syncedCount blocks to local database');
      return SyncItemResult(success: true, count: syncedCount);
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

      int updatedCount = 0;
      for (var update in updates) {
        try {
          final didUpdate = await _updateLocalHarvestStatus(update);
          if (didUpdate) {
            updatedCount++;
          } else {
            _logger.d(
                'No local harvest row matched server update id=${update['id']} localId=${update['localId']}');
          }
        } catch (e) {
          _logger.w('Failed to update harvest ${update['id']}: $e');
        }
      }

      // Save last sync timestamp
      await _saveLastHarvestSyncTimestamp(currentMandorId, DateTime.now());

      _logger.i('Updated $updatedCount harvest records from server');
      return SyncItemResult(success: true, count: updatedCount);
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

  Future<void> _upsertEmployee(Map<String, dynamic> emp) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final employeeId = emp['id']?.toString() ?? '';
    final nik = emp['nik']?.toString().trim() ?? '';
    final employeeCode = nik.isNotEmpty ? nik : employeeId;
    final divisionId = emp['divisionId']?.toString().trim();

    // Check if employee exists using employee_id (UUID)
    final employeeIdBytes = uuidToBytes(employeeId);
    final existing = await _databaseService.query(
      'employees',
      where: 'employee_id = ?',
      whereArgs: [employeeIdBytes],
    );

    final employeeData = {
      'employee_id': employeeIdBytes, // UUID from server (BLOB)
      'company_id': emp['companyId'] ?? '',
      'division_id':
          (divisionId != null && divisionId.isNotEmpty) ? divisionId : null,
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
      'is_active': 1,
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
      'is_active': 1,
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
            'Skip division upsert because estate parent is missing and company context is unavailable. division_id=$divisionId');
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
      'is_active': 1,
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
      'area_hectares':
          (block['luasHa'] as num?)?.toDouble(), // Mapped to area_hectares
      'planting_year': block['plantingYear'],
      'variety_type': block['cropType'],
      'is_active': 1,
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
          'Skip local harvest status update: current mandor session not found');
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
      String mandorId, DateTime timestamp) async {
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
          {
            'value': timestamp.toIso8601String(),
            'updated_at': now,
          },
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
          'Mandor master sync auth: access token expired/near expiry, trying refresh tiers...');
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
  int employeesSynced = 0;
  bool employeesSuccess = false;
  int blocksSynced = 0;
  bool blocksSuccess = false;
}

/// Result of syncing a single item type
class SyncItemResult {
  final bool success;
  final int count;
  final String? error;

  SyncItemResult({
    required this.success,
    required this.count,
    this.error,
  });
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
