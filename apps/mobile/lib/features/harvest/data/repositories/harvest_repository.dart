import 'dart:convert';
import 'dart:math';
import 'package:geolocator/geolocator.dart';
import 'package:logger/logger.dart';
import 'package:sqflite/sqflite.dart';

import 'package:agrinova_mobile/core/database/enhanced_database_service.dart';
import 'package:agrinova_mobile/core/database/uuid_blob_codec.dart';
import 'package:agrinova_mobile/core/services/location_service.dart';
import 'package:agrinova_mobile/core/services/camera_service.dart';
import 'package:agrinova_mobile/core/services/connectivity_service.dart';
import 'package:agrinova_mobile/core/services/unified_secure_storage_service.dart';
import '../../domain/entities/harvest_entity.dart';

abstract class HarvestRepository {
  // Harvest Management
  Future<String> createHarvest(Harvest harvest);
  Future<void> updateHarvest(Harvest harvest);
  Future<void> deleteHarvest(String harvestId);
  Future<Harvest?> getHarvest(String harvestId);
  Future<List<Harvest>> getAllHarvests({String? status, String? mandorId});
  Future<List<Harvest>> getHarvestsByDate(DateTime date);
  Future<List<Harvest>> getPendingHarvests();

  // Employee Management
  Future<List<Employee>> getEmployees({String? query, String? divisionId});
  Future<Employee?> getEmployee(String employeeId);

  // Block Management
  Future<List<Block>> getBlocks({String? query, String? divisionId});
  Future<Block?> getBlock(String blockId);

  // Image Management
  Future<String> captureHarvestPhoto();
  Future<void> attachPhotoToHarvest(String harvestId, String imagePath);

  // Location Services
  Future<Position?> getCurrentLocation();

  // Statistics
  Future<Map<String, dynamic>> getHarvestStats(
      DateTime startDate, DateTime endDate);
  Future<double> getTotalHarvestByMandor(String mandorId, DateTime date);

  // Offline Support
  Future<List<Harvest>> getUnsyncedHarvests();
  Future<void> markHarvestAsSynced(String harvestId);
  Future<void> markHarvestSyncFailed(String harvestId, String errorMessage);
}

class HarvestRepositoryImpl implements HarvestRepository {
  final EnhancedDatabaseService _databaseService;
  final LocationService _locationService;
  final CameraService _cameraService;
  final ConnectivityService _connectivityService;

  static final Logger _logger = Logger();
  static const String _harvestTable = 'harvest_records';

  int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  bool _isUuid(String value) => isUuidString(value.trim());

  void _validateCanonicalIds(Harvest harvest) {
    final employeeId = harvest.employeeId.trim();
    if (!_isUuid(employeeId)) {
      throw Exception(
        'Karyawan tidak valid. employee_id harus UUID, saat ini: "$employeeId"',
      );
    }

    final employeeNik = (harvest.employeeNik ?? '').trim();
    if (employeeNik.isEmpty) {
      throw Exception('NIK karyawan wajib terisi.');
    }

    final blockId = harvest.blockId.trim();
    if (blockId.isNotEmpty && !_isUuid(blockId)) {
      throw Exception(
        'Blok tidak valid. block_id harus UUID, saat ini: "$blockId"',
      );
    }
  }

  Map<String, int> _resolveQualityCounts(Harvest harvest) {
    final jumlah = harvest.jumlahJanjang > 0
        ? harvest.jumlahJanjang
        : harvest.tbsQuantity.toInt();

    var jjgMatang = harvest.jjgMatang;
    final jjgMentah = harvest.jjgMentah;
    final jjgLewatMatang = harvest.jjgLewatMatang;
    final jjgBusukAbnormal = harvest.jjgBusukAbnormal;
    final jjgTangkaiPanjang = harvest.jjgTangkaiPanjang;

    final providedTotal = jjgMatang +
        jjgMentah +
        jjgLewatMatang +
        jjgBusukAbnormal +
        jjgTangkaiPanjang;

    if (providedTotal == 0 && jumlah > 0) {
      jjgMatang = jumlah;
    } else if (providedTotal != jumlah && jumlah > 0) {
      final diff = jumlah - providedTotal;
      jjgMatang = (jjgMatang + diff).clamp(0, 2147483647).toInt();
    }

    return {
      'jumlah_janjang': jumlah < 0 ? 0 : jumlah,
      'jjg_matang': jjgMatang < 0 ? 0 : jjgMatang,
      'jjg_mentah': jjgMentah < 0 ? 0 : jjgMentah,
      'jjg_lewat_matang': jjgLewatMatang < 0 ? 0 : jjgLewatMatang,
      'jjg_busuk_abnormal': jjgBusukAbnormal < 0 ? 0 : jjgBusukAbnormal,
      'jjg_tangkai_panjang': jjgTangkaiPanjang < 0 ? 0 : jjgTangkaiPanjang,
    };
  }

  Map<String, dynamic> _toDbMap(Harvest harvest) {
    final harvestId = harvest.id.isEmpty ? _generateHarvestId() : harvest.id;
    final quality = _resolveQualityCounts(harvest);

    // Build coordinates JSON if lat/long are available
    String? coordinatesJson;
    if (harvest.latitude != null && harvest.longitude != null) {
      coordinatesJson = json.encode({
        'latitude': harvest.latitude,
        'longitude': harvest.longitude,
      });
    }

    return {
      'harvest_id': harvestId,
      'panen_number': harvestId,
      'block_id': uuidToBytes(harvest.blockId.trim()),
      'company_id': harvest.companyId,
      'estate_id': harvest.estateId,
      'division_id': harvest.divisionId,
      'division_code': (harvest.divisionCode ?? '').isNotEmpty
          ? harvest.divisionCode
          : harvest.divisionId,
      'mandor_scope': harvest.mandorScope,
      'karyawan_id': uuidToBytes(harvest.employeeId.trim()),
      'karyawan_nik': (harvest.employeeNik ?? '').trim(),
      'employee_division_id': (harvest.employeeDivisionId ?? '').trim().isEmpty
          ? null
          : harvest.employeeDivisionId!.trim(),
      'employee_division_name':
          (harvest.employeeDivisionName ?? '').trim().isEmpty
              ? null
              : harvest.employeeDivisionName!.trim(),
      'mandor_id': harvest.mandorId,
      'asisten_id': harvest.asistenId,
      'harvest_date': harvest.harvestDate.millisecondsSinceEpoch,
      'client_timestamp': DateTime.now().millisecondsSinceEpoch,
      'created_at': harvest.createdAt.millisecondsSinceEpoch,
      'updated_at':
          (harvest.updatedAt ?? DateTime.now()).millisecondsSinceEpoch,
      'status': harvest.status,
      'approved_by_id': harvest.approvedBy,
      'approval_date': harvest.approvedAt != null
          ? DateTime.tryParse(harvest.approvedAt!)?.millisecondsSinceEpoch
          : null,
      'rejection_reason': harvest.rejectionReason,
      'notes': harvest.notes,
      'coordinates': coordinatesJson,
      'photo_paths':
          harvest.imageUrl != null ? '["${harvest.imageUrl}"]' : null,
      'sync_status': harvest.isSynced ? 'SYNCED' : 'PENDING',
      'needs_sync': harvest.isSynced ? 0 : 1,
      'jumlah_janjang': quality['jumlah_janjang'] ?? 0,
      'jjg_matang': quality['jjg_matang'] ?? 0,
      'jjg_mentah': quality['jjg_mentah'] ?? 0,
      'jjg_lewat_matang': quality['jjg_lewat_matang'] ?? 0,
      'jjg_busuk_abnormal': quality['jjg_busuk_abnormal'] ?? 0,
      'jjg_tangkai_panjang': quality['jjg_tangkai_panjang'] ?? 0,
      'total_weight': harvest.tbsQuantity,
      'total_brondolan': 0.0,
    };
  }

  Harvest _fromDbMap(Map<String, dynamic> map) {
    String? imageUrl;
    if (map['photo_paths'] != null) {
      try {
        List<dynamic> photos = json.decode(map['photo_paths']);
        if (photos.isNotEmpty) imageUrl = photos.first;
      } catch (_) {}
    }

    // Parse coordinates JSON for lat/long
    double? lat;
    double? long;
    if (map['coordinates'] != null) {
      try {
        final coords = json.decode(map['coordinates']);
        lat = (coords['latitude'] as num?)?.toDouble();
        long = (coords['longitude'] as num?)?.toDouble();
      } catch (_) {}
    }

    // Get harvest_id (primary identifier)
    final harvestId =
        map['harvest_id']?.toString() ?? map['id']?.toString() ?? '';
    final jumlahJanjang = _toInt(map['jumlah_janjang']) > 0
        ? _toInt(map['jumlah_janjang'])
        : (_toInt(map['total_tbs']) > 0
            ? _toInt(map['total_tbs'])
            : _toInt(map['total_weight']));
    final jjgMentah = _toInt(map['jjg_mentah']);
    final jjgLewatMatang = _toInt(map['jjg_lewat_matang']);
    final jjgBusukAbnormal = _toInt(map['jjg_busuk_abnormal']);
    final jjgTangkaiPanjang = _toInt(map['jjg_tangkai_panjang']);
    var jjgMatang = _toInt(map['jjg_matang']);

    final totalQuality = jjgMatang +
        jjgMentah +
        jjgLewatMatang +
        jjgBusukAbnormal +
        jjgTangkaiPanjang;
    if (totalQuality == 0 && jumlahJanjang > 0) {
      jjgMatang = jumlahJanjang;
    }

    final employeeId =
        dbUuidToString(map['karyawan_id'] ?? map['employee_id']) ?? '';
    final employeeName = (map['employee_name']?.toString() ?? '').trim();
    final resolvedEmployeeName =
        employeeName.isNotEmpty ? employeeName : employeeId;

    final blockId = dbUuidToString(map['block_id']) ?? '';
    final blockName = (map['block_name']?.toString() ?? '').trim();
    final resolvedBlockName = blockName.isNotEmpty ? blockName : blockId;

    return Harvest(
      id: harvestId,
      employeeId: employeeId,
      employeeName: resolvedEmployeeName,
      employeeNik: (map['karyawan_nik'] ?? map['employee_nik'])?.toString(),
      employeeDivisionId: (map['employee_division_id'] ??
              map['emp_division_id'] ??
              map['emp_division_uuid'])
          ?.toString(),
      employeeDivisionName:
          (map['employee_division_name'] ?? map['emp_division_name'])
              ?.toString(),
      blockId: blockId,
      blockName: resolvedBlockName,
      blockCode: map['block_code']?.toString(),
      divisionId: map['division_id']?.toString() ??
          map['division_code']?.toString() ??
          '',
      divisionName: map['division_name']?.toString() ?? '',
      divisionCode: map['resolved_division_code']?.toString() ??
          map['division_code']?.toString(),
      estateId: map['resolved_estate_id']?.toString() ??
          map['estate_id']?.toString() ??
          '',
      estateName: map['estate_name']?.toString() ?? '',
      tbsQuantity: jumlahJanjang > 0
          ? jumlahJanjang.toDouble()
          : (map['total_weight'] as num?)?.toDouble() ?? 0.0,
      jumlahJanjang: jumlahJanjang,
      jjgMatang: jjgMatang,
      jjgMentah: jjgMentah,
      jjgLewatMatang: jjgLewatMatang,
      jjgBusukAbnormal: jjgBusukAbnormal,
      jjgTangkaiPanjang: jjgTangkaiPanjang,
      tbsQuality: 0.0,
      qualityGrade: 'B',
      harvestDate: map['harvest_date'] is int
          ? DateTime.fromMillisecondsSinceEpoch(map['harvest_date'])
          : DateTime.parse(map['harvest_date'].toString()),
      createdAt: map['created_at'] is int
          ? DateTime.fromMillisecondsSinceEpoch(map['created_at'])
          : DateTime.parse(map['created_at'].toString()),
      updatedAt: map['updated_at'] != null
          ? (map['updated_at'] is int
              ? DateTime.fromMillisecondsSinceEpoch(map['updated_at'])
              : DateTime.parse(map['updated_at'].toString()))
          : null,
      status: map['status'] ?? 'PENDING',
      approvedBy: map['approved_by_id'],
      rejectionReason: map['rejection_reason'],
      notes: map['notes'],
      latitude: lat,
      longitude: long,
      imageUrl: imageUrl,
      mandorId: map['mandor_id'],
      mandorName: map['mandor_name']?.toString() ?? '',
      isSynced: map['sync_status'] == 'SYNCED',
      syncErrorMessage: map['sync_error_message'],
      companyId: map['company_id'],
      managerId: map['manager_id'],
      asistenId: map['asisten_id'],
      mandorScope: map['mandor_scope']?.toString(),
    );
  }

  HarvestRepositoryImpl({
    required EnhancedDatabaseService databaseService,
    required LocationService locationService,
    required CameraService cameraService,
    required ConnectivityService connectivityService,
  })  : _databaseService = databaseService,
        _locationService = locationService,
        _cameraService = cameraService,
        _connectivityService = connectivityService;

  Future<List<Map<String, dynamic>>> _queryHarvestRows({
    String? whereClause,
    List<dynamic>? whereArgs,
    String orderBy = 'hr.harvest_date DESC',
    int? limit,
  }) async {
    final sql = StringBuffer()
      ..writeln('SELECT')
      ..writeln('  hr.*,')
      ..writeln('  COALESCE(hr.karyawan_id, he.employee_id) AS karyawan_id,')
      ..writeln(
          "  COALESCE(hr.karyawan_nik, emp.employee_code, '') AS karyawan_nik,")
      ..writeln("  COALESCE(emp.full_name, '') AS employee_name,")
      ..writeln(
          "  COALESCE(hr.employee_division_id, emp.division_id, '') AS employee_division_id,")
      ..writeln(
          "  COALESCE(hr.employee_division_name, d_emp.name, '') AS employee_division_name,")
      ..writeln('  COALESCE(hr.block_id, b_id.block_id) AS block_id,')
      ..writeln("  COALESCE(b_id.name, '') AS block_name,")
      ..writeln("  COALESCE(b_id.code, '') AS block_code,")
      ..writeln(
          "  COALESCE(d.code, hr.division_code, hr.division_id, '') AS resolved_division_code,")
      ..writeln('  COALESCE(e.estate_id, hr.estate_id) AS resolved_estate_id,')
      ..writeln("  COALESCE(u.full_name, '') AS mandor_name,")
      ..writeln("  COALESCE(e.name, '') AS estate_name,")
      ..writeln("  COALESCE(d.name, '') AS division_name,")
      ..writeln(
          '  COALESCE(d.division_id, hr.division_id, hr.division_code) AS division_id')
      ..writeln('FROM harvest_records hr')
      ..writeln('LEFT JOIN (')
      ..writeln('  SELECT harvest_id, MIN(employee_id) AS employee_id')
      ..writeln('  FROM harvest_employees')
      ..writeln('  GROUP BY harvest_id')
      ..writeln(') he ON he.harvest_id = hr.harvest_id')
      ..writeln(
          'LEFT JOIN employees emp ON emp.employee_id = COALESCE(hr.karyawan_id, he.employee_id)')
      ..writeln(
          'LEFT JOIN divisions d_emp ON d_emp.division_id = emp.division_id')
      ..writeln('LEFT JOIN blocks b_id ON b_id.block_id = hr.block_id')
      ..writeln(
          'LEFT JOIN divisions d ON d.division_id = COALESCE(b_id.division_id, hr.division_id)')
      ..writeln('LEFT JOIN estates e ON e.estate_id = d.estate_id')
      ..writeln('LEFT JOIN users u ON u.user_id = hr.mandor_id');

    if (whereClause != null && whereClause.trim().isNotEmpty) {
      sql.writeln('WHERE $whereClause');
    }

    sql.writeln('ORDER BY $orderBy');

    if (limit != null && limit > 0) {
      sql.writeln('LIMIT $limit');
    }

    return _databaseService.rawQuery(sql.toString(), whereArgs ?? []);
  }

  Future<void> _ensureOnlineAccess() async {
    _logger.d('_ensureOnlineAccess: isOnline=${_connectivityService.isOnline}');
    if (_connectivityService.isOnline) return;

    final user = await UnifiedSecureStorageService.getUserInfo();
    final role = (user?.role ?? '').toLowerCase();
    _logger.d('_ensureOnlineAccess: role=$role, offline mode check');

    if (role != 'mandor') {
      _logger.w('Offline access denied for role: $role');
      throw Exception(
          'Mode offline tidak tersedia. Harap periksa koneksi internet Anda.');
    }
    _logger.d('_ensureOnlineAccess: MANDOR offline access allowed');
  }

  Future<String?> _getCurrentMandorIdOrNull() async {
    final currentUserId = await UnifiedSecureStorageService.getCurrentUserId();
    final trimmedCurrentUserId = currentUserId?.trim() ?? '';
    if (trimmedCurrentUserId.isNotEmpty) {
      return trimmedCurrentUserId;
    }

    final user = await UnifiedSecureStorageService.getUserInfo();
    final fallbackUserId = user?.id.trim() ?? '';
    if (fallbackUserId.isNotEmpty) {
      return fallbackUserId;
    }

    return null;
  }

  Future<String> _requireCurrentMandorId() async {
    final currentMandorId = await _getCurrentMandorIdOrNull();
    if (currentMandorId == null || currentMandorId.isEmpty) {
      throw Exception('Sesi pengguna tidak ditemukan. Silakan login ulang.');
    }
    return currentMandorId;
  }

  Map<String, String> _resolveDuplicateKey(Harvest harvest) {
    final employeeId = harvest.employeeId.trim();
    final blockId = harvest.blockId.trim();

    return {
      'employeeId': employeeId,
      'blockId': blockId,
    };
  }

  Future<void> _ensureNoDuplicateHarvest({
    required DatabaseExecutor db,
    required Harvest harvest,
    String? excludeHarvestId,
  }) async {
    final key = _resolveDuplicateKey(harvest);
    final employeeId = key['employeeId'] ?? '';
    final blockId = key['blockId'] ?? '';

    if (employeeId.isEmpty || blockId.isEmpty) return;

    final startOfDay = DateTime(
      harvest.harvestDate.year,
      harvest.harvestDate.month,
      harvest.harvestDate.day,
    );
    final endOfDay = startOfDay.add(const Duration(days: 1));

    final whereBuffer = StringBuffer(
      'mandor_id = ? AND harvest_date >= ? AND harvest_date < ? AND karyawan_id = ? AND block_id = ?',
    );
    final whereArgs = <dynamic>[
      harvest.mandorId,
      startOfDay.millisecondsSinceEpoch,
      endOfDay.millisecondsSinceEpoch,
      uuidToBytes(employeeId),
      uuidToBytes(blockId),
    ];

    if (excludeHarvestId != null && excludeHarvestId.isNotEmpty) {
      whereBuffer.write(' AND harvest_id <> ?');
      whereArgs.add(excludeHarvestId);
    }

    final existingRows = await db.query(
      _harvestTable,
      columns: const ['harvest_id'],
      where: whereBuffer.toString(),
      whereArgs: whereArgs,
      limit: 1,
    );

    if (existingRows.isNotEmpty) {
      throw Exception(
        'Data panen duplikat: tanggal, karyawan, dan blok yang sama sudah ada.',
      );
    }
  }

  Future<void> _ensureHarvestEditable(
    String harvestId, {
    bool allowRejected = false,
  }) async {
    final currentMandorId = await _requireCurrentMandorId();
    final db = await _databaseService.database;
    final rows = await db.query(
      _harvestTable,
      columns: const ['status', 'sync_status', 'needs_sync'],
      where: 'harvest_id = ? AND mandor_id = ?',
      whereArgs: [harvestId, currentMandorId],
      limit: 1,
    );

    if (rows.isEmpty) {
      throw Exception('Data panen tidak ditemukan.');
    }

    final row = rows.first;
    final status = (row['status']?.toString() ?? '').toUpperCase();
    final syncStatus = (row['sync_status']?.toString() ?? '').toUpperCase();
    final needsSync = _toInt(row['needs_sync']);
    final isPending = status == 'PENDING';
    final isRejected = status == 'REJECTED';

    if (!isPending && !(allowRejected && isRejected)) {
      final allowedText = allowRejected ? 'PENDING atau REJECTED' : 'PENDING';
      throw Exception(
          'Hanya data status $allowedText yang dapat diubah/dihapus.');
    }

    if (!(allowRejected && isRejected) &&
        (syncStatus == 'SYNCED' || needsSync == 0)) {
      throw Exception(
        'Data panen sudah tersinkron ke server dan tidak dapat diubah/dihapus.',
      );
    }
  }

  @override
  Future<String> createHarvest(Harvest harvest) async {
    await _ensureOnlineAccess();
    try {
      final harvestId = harvest.id.isEmpty ? _generateHarvestId() : harvest.id;
      if (harvest.blockId.trim().isEmpty) {
        throw Exception('Blok tidak valid. Pilih blok panen terlebih dahulu.');
      }
      if (harvest.employeeId.trim().isEmpty) {
        throw Exception(
            'Karyawan tidak valid. Pilih karyawan terlebih dahulu.');
      }
      _validateCanonicalIds(harvest);

      // Get current location if not provided
      Position? position;
      if (harvest.latitude == null || harvest.longitude == null) {
        position = await getCurrentLocation();
      }

      final currentMandorId = await _requireCurrentMandorId();
      final harvestWithLocation = harvest.copyWith(
        id: harvestId,
        mandorId: currentMandorId,
        latitude: harvest.latitude ?? position?.latitude,
        longitude: harvest.longitude ?? position?.longitude,
        createdAt: DateTime.now(),
        status: 'PENDING',
        isSynced: false,
      );

      final db = await _databaseService.database;
      final now = DateTime.now().millisecondsSinceEpoch;

      await db.transaction((txn) async {
        await _ensureNoDuplicateHarvest(
          db: txn,
          harvest: harvestWithLocation,
        );

        await txn.insert(_harvestTable, _toDbMap(harvestWithLocation));

        if (harvestWithLocation.employeeId.isNotEmpty) {
          await txn.insert('harvest_employees', {
            'harvest_id': harvestId,
            'employee_id': uuidToBytes(harvestWithLocation.employeeId),
            'role': 'PEMANEN',
            'tbs_count': harvestWithLocation.jumlahJanjang > 0
                ? harvestWithLocation.jumlahJanjang
                : harvestWithLocation.tbsQuantity.toInt(),
            'weight': harvestWithLocation.tbsQuantity,
            'brondolan': 0.0,
            'created_at': now,
            'updated_at': now,
            'sync_status': 'PENDING',
            'version': 1,
          });
        }
      });

      _logger.d('Harvest created: $harvestId');
      return harvestId;
    } catch (e) {
      _logger.e('Error creating harvest: $e');
      rethrow;
    }
  }

  @override
  Future<void> updateHarvest(Harvest harvest) async {
    await _ensureOnlineAccess();
    try {
      await _ensureHarvestEditable(harvest.id, allowRejected: true);
      final currentMandorId = await _requireCurrentMandorId();

      if (harvest.blockId.trim().isEmpty) {
        throw Exception('Blok tidak valid. Pilih blok panen terlebih dahulu.');
      }
      if (harvest.employeeId.trim().isEmpty) {
        throw Exception(
            'Karyawan tidak valid. Pilih karyawan terlebih dahulu.');
      }
      _validateCanonicalIds(harvest);

      final updatedHarvest = harvest.copyWith(
        mandorId: currentMandorId,
        updatedAt: DateTime.now(),
        isSynced: false,
      );

      final db = await _databaseService.database;
      await db.transaction((txn) async {
        await _ensureNoDuplicateHarvest(
          db: txn,
          harvest: updatedHarvest,
          excludeHarvestId: harvest.id,
        );

        await txn.update(
          _harvestTable,
          _toDbMap(updatedHarvest),
          where: 'harvest_id = ? AND mandor_id = ?',
          whereArgs: [harvest.id, currentMandorId],
        );
      });

      _logger.d('Harvest updated: ${harvest.id}');
    } catch (e) {
      _logger.e('Error updating harvest: $e');
      rethrow;
    }
  }

  @override
  Future<void> deleteHarvest(String harvestId) async {
    await _ensureOnlineAccess();
    try {
      await _ensureHarvestEditable(harvestId);

      final currentMandorId = await _requireCurrentMandorId();
      await _databaseService.delete(
        _harvestTable,
        'harvest_id = ? AND mandor_id = ?',
        [harvestId, currentMandorId],
      );

      _logger.d('Harvest deleted: $harvestId');
    } catch (e) {
      _logger.e('Error deleting harvest: $e');
      rethrow;
    }
  }

  @override
  Future<Harvest?> getHarvest(String harvestId) async {
    await _ensureOnlineAccess();
    try {
      final currentMandorId = await _requireCurrentMandorId();
      final targetId = harvestId.trim();
      if (targetId.isEmpty) {
        return null;
      }
      final results = await _queryHarvestRows(
        whereClause:
            '(hr.harvest_id = ? OR hr.server_id = ?) AND hr.mandor_id = ?',
        whereArgs: [targetId, targetId, currentMandorId],
        limit: 1,
      );

      if (results.isEmpty) return null;

      return _fromDbMap(results.first);
    } catch (e) {
      _logger.e('Error getting harvest: $e');
      return null;
    }
  }

  @override
  Future<List<Harvest>> getAllHarvests(
      {String? status, String? mandorId}) async {
    await _ensureOnlineAccess();
    try {
      final currentMandorId = await _requireCurrentMandorId();
      final effectiveMandorId = currentMandorId;

      String? whereClause;
      List<dynamic>? whereArgs;

      if (status != null) {
        whereClause = 'hr.status = ? AND hr.mandor_id = ?';
        whereArgs = [status, effectiveMandorId];
      } else {
        whereClause = 'hr.mandor_id = ?';
        whereArgs = [effectiveMandorId];
      }

      final results = await _queryHarvestRows(
        whereClause: whereClause,
        whereArgs: whereArgs,
      );

      return results.map((json) => _fromDbMap(json)).toList();
    } catch (e) {
      _logger.e('Error getting all harvests: $e');
      return [];
    }
  }

  @override
  Future<List<Harvest>> getHarvestsByDate(DateTime date) async {
    await _ensureOnlineAccess();
    try {
      final currentMandorId = await _requireCurrentMandorId();
      final startOfDay = DateTime(date.year, date.month, date.day);
      final endOfDay = startOfDay.add(const Duration(days: 1));

      final results = await _queryHarvestRows(
        whereClause:
            'hr.mandor_id = ? AND hr.harvest_date >= ? AND hr.harvest_date < ?',
        whereArgs: [
          currentMandorId,
          startOfDay.millisecondsSinceEpoch,
          endOfDay.millisecondsSinceEpoch
        ],
      );

      return results.map((json) => _fromDbMap(json)).toList();
    } catch (e) {
      _logger.e('Error getting harvests by date: $e');
      return [];
    }
  }

  @override
  Future<List<Harvest>> getPendingHarvests() async {
    await _ensureOnlineAccess();
    return await getAllHarvests(status: 'PENDING');
  }

  // Helper mapping methods
  Employee _employeeFromDb(Map<String, dynamic> map) {
    final employeeId = dbUuidToString(map['employee_id']) ?? '';
    final divisionId = map['division_id']?.toString().trim() ?? '';
    final divisionName = map['division_name']?.toString().trim() ?? '';
    return Employee(
      id: employeeId,
      name: map['full_name']?.toString() ?? '',
      code: map['employee_code']?.toString() ?? employeeId,
      divisionId: divisionId,
      divisionName: divisionName,
      role: map['position']?.toString() ?? '',
      isActive: map['is_active'] == 1 || map['is_active'] == true,
      createdAt: map['created_at'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['created_at'])
          : DateTime.now(),
    );
  }

  Block _blockFromDb(Map<String, dynamic> map) {
    _logger.d('_blockFromDb raw map: $map');
    final area = map['area_hectares'] ?? map['area'] ?? 0.0;
    final blockId = dbUuidToString(map['block_id']) ?? '';
    final divisionName = (map['resolved_division_name'] ??
                map['division_name'] ??
                map['division_code'])
            ?.toString()
            .trim() ??
        '';
    final divisionCode = (map['resolved_division_code'] ?? map['division_code'])
        ?.toString()
        .trim();
    final estateId =
        (map['resolved_estate_id'] ?? map['estate_id'])?.toString() ?? '';
    final estateName =
        (map['resolved_estate_name'] ?? map['estate_name'])?.toString() ?? '';
    return Block(
      id: blockId,
      name: map['name']?.toString() ?? '',
      code: map['code']?.toString() ?? '',
      divisionId: map['division_id']?.toString() ?? '',
      divisionName: divisionName,
      divisionCode: (divisionCode != null && divisionCode.isNotEmpty)
          ? divisionCode
          : null,
      estateId: estateId,
      estateName: estateName,
      area: (area is num) ? area.toDouble() : 0.0,
      plantYear: _toInt(map['planting_year']),
      varietyType: map['variety_type']?.toString() ?? '',
      isActive: map['is_active'] == 1,
    );
  }

  @override
  Future<List<Employee>> getEmployees(
      {String? query, String? divisionId}) async {
    await _ensureOnlineAccess();
    try {
      String whereClause = 'e.is_active = 1';
      List<dynamic> whereArgs = [];

      if (divisionId != null && divisionId.isNotEmpty) {
        whereClause += ' AND e.division_id = ?';
        whereArgs.add(divisionId);
      }

      if (query != null && query.isNotEmpty) {
        whereClause +=
            ' AND (e.full_name LIKE ? OR e.employee_code LIKE ? OR COALESCE(d.name, \'\') LIKE ?)';
        whereArgs.add('%$query%');
        whereArgs.add('%$query%');
        whereArgs.add('%$query%');
      }

      final db = await _databaseService.database;
      final results = await db.rawQuery(
        '''
        SELECT
          e.*,
          COALESCE(d.name, '') AS division_name
        FROM employees e
        LEFT JOIN divisions d ON d.division_id = e.division_id
        WHERE $whereClause
        ORDER BY e.full_name ASC
        ''',
        whereArgs,
      );

      _logger.d('getEmployees query result count: ${results.length}');
      if (results.isNotEmpty) {
        _logger.d('First employee raw data: ${results.first}');
      }

      // Employees are synced from server via MandorMasterSyncService
      final employees = results.map((json) => _employeeFromDb(json)).toList();
      _logger.d('Mapped employees count: ${employees.length}');

      return employees;
    } catch (e) {
      _logger.e('Error getting employees: $e');
      return [];
    }
  }

  @override
  Future<Employee?> getEmployee(String employeeId) async {
    await _ensureOnlineAccess();
    try {
      final db = await _databaseService.database;
      final results = await db.rawQuery(
        '''
        SELECT
          e.*,
          COALESCE(d.name, '') AS division_name
        FROM employees e
        LEFT JOIN divisions d ON d.division_id = e.division_id
        WHERE e.employee_id = ?
        LIMIT 1
        ''',
        [uuidToBytes(employeeId)],
      );

      if (results.isEmpty) {
        return null;
      }

      return _employeeFromDb(results.first);
    } catch (e) {
      _logger.e('Error getting employee: $e');
      return null;
    }
  }

  @override
  Future<List<Block>> getBlocks({String? query, String? divisionId}) async {
    await _ensureOnlineAccess();
    try {
      String whereClause = 'b.is_active = 1';
      List<dynamic> whereArgs = [];

      if (divisionId != null && divisionId.isNotEmpty) {
        whereClause += ' AND b.division_id = ?';
        whereArgs.add(divisionId);
      }

      if (query != null && query.isNotEmpty) {
        whereClause += ' AND (b.name LIKE ? OR b.code LIKE ?)';
        whereArgs.add('%$query%');
        whereArgs.add('%$query%');
      }

      final db = await _databaseService.database;
      final results = await db.rawQuery(
        '''
        SELECT
          b.*,
          COALESCE(NULLIF(TRIM(d.name), ''), NULLIF(TRIM(d.code), ''), '') AS resolved_division_name,
          COALESCE(NULLIF(TRIM(d.code), ''), '') AS resolved_division_code,
          COALESCE(d.estate_id, '') AS resolved_estate_id,
          COALESCE(NULLIF(TRIM(e.name), ''), '') AS resolved_estate_name
        FROM blocks b
        LEFT JOIN divisions d ON d.division_id = b.division_id
        LEFT JOIN estates e ON e.estate_id = d.estate_id
        WHERE $whereClause
        ORDER BY b.name ASC
        ''',
        whereArgs,
      );

      _logger.d('getBlocks query result count: ${results.length}');
      if (results.isNotEmpty) {
        _logger.d('First block raw data: ${results.first}');
      }

      // Blocks are synced from server via MandorMasterSyncService
      final blocks = results.map((json) => _blockFromDb(json)).toList();
      _logger.d('Mapped blocks count: ${blocks.length}');

      return blocks;
    } catch (e) {
      _logger.e('Error getting blocks: $e');
      return [];
    }
  }

  // Note: Master data (employees, blocks) are synced from server via MandorMasterSyncService

  @override
  Future<Block?> getBlock(String blockId) async {
    await _ensureOnlineAccess();
    try {
      final db = await _databaseService.database;
      final results = await db.rawQuery(
        '''
        SELECT
          b.*,
          COALESCE(NULLIF(TRIM(d.name), ''), NULLIF(TRIM(d.code), ''), '') AS resolved_division_name,
          COALESCE(NULLIF(TRIM(d.code), ''), '') AS resolved_division_code,
          COALESCE(d.estate_id, '') AS resolved_estate_id,
          COALESCE(NULLIF(TRIM(e.name), ''), '') AS resolved_estate_name
        FROM blocks b
        LEFT JOIN divisions d ON d.division_id = b.division_id
        LEFT JOIN estates e ON e.estate_id = d.estate_id
        WHERE b.block_id = ?
        LIMIT 1
        ''',
        [uuidToBytes(blockId)],
      );

      if (results.isEmpty) return null;

      return _blockFromDb(results.first);
    } catch (e) {
      _logger.e('Error getting block: $e');
      return null;
    }
  }

  @override
  Future<String> captureHarvestPhoto() async {
    // Camera works offline, but if the flow is restricted, maybe this should be too?
    // But captureHarvestPhoto is usually called during createHarvest flow.
    // If createHarvest is blocked, this might not be reached or useful.
    // I'll leave it as is for now, or add check if strict.
    // Let's add check for consistency.
    await _ensureOnlineAccess();
    try {
      final imageFile = await _cameraService.takePicture();
      if (imageFile != null) {
        return imageFile.path;
      }
      throw Exception('No image captured');
    } catch (e) {
      _logger.e('Error capturing harvest photo: $e');
      rethrow;
    }
  }

  @override
  Future<void> attachPhotoToHarvest(String harvestId, String imagePath) async {
    await _ensureOnlineAccess();
    try {
      final currentMandorId = await _requireCurrentMandorId();
      await _databaseService.update(
        _harvestTable,
        {
          'photo_paths': '["$imagePath"]',
          'updated_at': DateTime.now().millisecondsSinceEpoch,
          'sync_status': 'PENDING',
        },
        where: 'harvest_id = ? AND mandor_id = ?',
        whereArgs: [harvestId, currentMandorId],
      );

      _logger.d('Photo attached to harvest: $harvestId');
    } catch (e) {
      _logger.e('Error attaching photo to harvest: $e');
      rethrow;
    }
  }

  @override
  Future<Position?> getCurrentLocation() async {
    // Location service itself doesn't need internet, but if we restrict "Offline First" app usage...
    // I'll leave this one open as it's a utility.
    try {
      return await _locationService.getCurrentPosition();
    } catch (e) {
      _logger.w('Could not get current location: $e');
      return null;
    }
  }

  @override
  Future<Map<String, dynamic>> getHarvestStats(
      DateTime startDate, DateTime endDate) async {
    await _ensureOnlineAccess();
    try {
      final currentMandorId = await _requireCurrentMandorId();
      final results = await _databaseService.query(
        _harvestTable,
        where: 'mandor_id = ? AND harvest_date >= ? AND harvest_date <= ?',
        whereArgs: [
          currentMandorId,
          startDate.millisecondsSinceEpoch,
          endDate.millisecondsSinceEpoch
        ],
      );

      final harvests = results.map((json) => _fromDbMap(json)).toList();

      return {
        'totalHarvests': harvests.length,
        'totalQuantity':
            harvests.fold<double>(0, (sum, h) => sum + h.tbsQuantity),
        'averageQuality': harvests.isEmpty
            ? 0
            : harvests.fold<double>(0, (sum, h) => sum + h.tbsQuality) /
                harvests.length,
        'pendingCount': harvests.where((h) => h.status == 'PENDING').length,
        'approvedCount': harvests.where((h) => h.status == 'APPROVED').length,
        'rejectedCount': harvests.where((h) => h.status == 'REJECTED').length,
        'uniqueEmployees': harvests.map((h) => h.employeeId).toSet().length,
        'uniqueBlocks': harvests.map((h) => h.blockId).toSet().length,
      };
    } catch (e) {
      _logger.e('Error getting harvest stats: $e');
      return {};
    }
  }

  @override
  Future<double> getTotalHarvestByMandor(String mandorId, DateTime date) async {
    await _ensureOnlineAccess();
    try {
      final currentMandorId = await _requireCurrentMandorId();
      final startOfDay = DateTime(date.year, date.month, date.day);
      final endOfDay = startOfDay.add(const Duration(days: 1));

      final results = await _databaseService.query(
        _harvestTable,
        where: 'mandor_id = ? AND harvest_date >= ? AND harvest_date < ?',
        whereArgs: [
          currentMandorId,
          startOfDay.millisecondsSinceEpoch,
          endOfDay.millisecondsSinceEpoch
        ],
      );

      final harvests = results.map((json) => _fromDbMap(json)).toList();
      return harvests.fold<double>(
          0, (sum, harvest) => sum + harvest.tbsQuantity);
    } catch (e) {
      _logger.e('Error getting total harvest by mandor: $e');
      return 0.0;
    }
  }

  @override
  Future<List<Harvest>> getUnsyncedHarvests() async {
    try {
      final currentMandorId = await _requireCurrentMandorId();
      final results = await _databaseService.query(
        _harvestTable,
        where: "sync_status = 'PENDING' AND mandor_id = ?",
        whereArgs: [currentMandorId],
        orderBy: 'created_at ASC',
      );

      return results.map((json) => _fromDbMap(json)).toList();
    } catch (e) {
      _logger.e('Error getting unsynced harvests: $e');
      return [];
    }
  }

  @override
  Future<void> markHarvestAsSynced(String harvestId) async {
    try {
      final currentMandorId = await _requireCurrentMandorId();
      await _databaseService.update(
        _harvestTable,
        {
          'sync_status': 'SYNCED',
          'sync_error_message': null,
          'updated_at': DateTime.now().millisecondsSinceEpoch,
          'synced_at': DateTime.now().millisecondsSinceEpoch,
        },
        where: 'harvest_id = ? AND mandor_id = ?',
        whereArgs: [harvestId, currentMandorId],
      );

      _logger.d('Harvest marked as synced: $harvestId');
    } catch (e) {
      _logger.e('Error marking harvest as synced: $e');
      rethrow;
    }
  }

  @override
  Future<void> markHarvestSyncFailed(
      String harvestId, String errorMessage) async {
    try {
      final currentMandorId = await _requireCurrentMandorId();
      await _databaseService.update(
        _harvestTable,
        {
          'sync_status': 'PENDING', // Still pending but with error
          'sync_error_message': errorMessage,
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        },
        where: 'harvest_id = ? AND mandor_id = ?',
        whereArgs: [harvestId, currentMandorId],
      );

      _logger.w('Harvest sync failed: $harvestId - $errorMessage');
    } catch (e) {
      _logger.e('Error marking harvest sync failed: $e');
      rethrow;
    }
  }

  // Private helper methods
  String _generateHarvestId() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = Random().nextInt(9999);
    return 'HRV-$timestamp-$random';
  }
}
