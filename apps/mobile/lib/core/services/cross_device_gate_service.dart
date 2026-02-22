import 'package:logger/logger.dart';
import '../database/enhanced_database_service.dart';
import '../services/device_service.dart';
import '../../features/gate_check/data/models/gate_check_models.dart';

/// Service untuk handle cross-device gate check operations
class CrossDeviceGateService {
  static final CrossDeviceGateService _instance =
      CrossDeviceGateService._internal();
  factory CrossDeviceGateService() => _instance;
  CrossDeviceGateService._internal();

  final Logger _logger = Logger();
  final EnhancedDatabaseService _db = EnhancedDatabaseService();

  /// Find entry record untuk exit processing
  /// Checks both local database dan QR data untuk cross-device scenarios
  Future<Map<String, dynamic>?> findEntryForExit(
    String vehiclePlate,
    Map<String, dynamic> qrGuestData,
  ) async {
    try {
      // 1. Check local database first for entry record
      final localEntry = await _findLocalEntryRecord(vehiclePlate);
      if (localEntry != null) {
        _logger.d('Found local entry record for vehicle: $vehiclePlate');
        return localEntry;
      }

      // 2. If not found locally, construct entry data from QR token
      // This handles cross-device scenario where entry was on different device
      final entryFromQR = _constructEntryFromQRData(qrGuestData);
      if (entryFromQR != null) {
        _logger.d(
            'Constructed entry data from QR for cross-device exit: $vehiclePlate');
        return entryFromQR;
      }

      _logger.w('No entry record found for vehicle: $vehiclePlate');
      return null;
    } catch (e) {
      _logger.e('Error finding entry for exit', error: e);
      return null;
    }
  }

  /// Check if vehicle has existing exit record to prevent duplicates
  Future<bool> hasExistingExitRecord(String vehiclePlate) async {
    try {
      final result = await _db.query(
        'gate_guest_logs',
        where:
            'vehicle_plate = ? AND exit_time IS NOT NULL AND generation_intent = ?',
        whereArgs: [vehiclePlate, 'EXIT'],
        limit: 1,
      );

      return result.isNotEmpty;
    } catch (e) {
      _logger.w('Error checking existing exit record', error: e);
      return false;
    }
  }

  /// Validate exit can be processed
  Future<Map<String, dynamic>> validateExitProcessing({
    required String vehiclePlate,
    required Map<String, dynamic> qrGuestData,
  }) async {
    try {
      // 1. Check for duplicate exit
      final hasDuplicateExit = await hasExistingExitRecord(vehiclePlate);
      if (hasDuplicateExit) {
        return {
          'isValid': false,
          'error': 'Kendaraan $vehiclePlate sudah memiliki record keluar',
          'errorType': 'DUPLICATE_EXIT'
        };
      }

      // 2. Find entry reference
      final entryReference = await findEntryForExit(vehiclePlate, qrGuestData);
      if (entryReference == null) {
        return {
          'isValid': false,
          'error': 'Tidak ada record masuk untuk kendaraan $vehiclePlate',
          'errorType': 'NO_ENTRY_RECORD'
        };
      }

      // 3. Validate time window
      final entryTime = DateTime.fromMillisecondsSinceEpoch(
          entryReference['entry_time'] as int);
      final now = DateTime.now();
      final stayDuration = now.difference(entryTime);

      if (stayDuration.inMinutes < 5) {
        return {
          'isValid': false,
          'error':
              'Kendaraan baru masuk ${stayDuration.inMinutes} menit lalu. Minimal 5 menit.',
          'errorType': 'TOO_SOON'
        };
      }

      if (stayDuration.inHours > 48) {
        return {
          'isValid': true,
          'warning': 'Kendaraan sudah berada di dalam lebih dari 48 jam',
          'entryReference': entryReference
        };
      }

      return {
        'isValid': true,
        'entryReference': entryReference,
        'stayDuration': stayDuration,
      };
    } catch (e) {
      _logger.e('Error validating exit processing', error: e);
      return {
        'isValid': false,
        'error': 'Error validasi: ${e.toString()}',
        'errorType': 'VALIDATION_ERROR'
      };
    }
  }

  // Private helper methods

  Future<Map<String, dynamic>?> _findLocalEntryRecord(
      String vehiclePlate) async {
    try {
      final result = await _db.query(
        'gate_guest_logs',
        where:
            'vehicle_plate = ? AND entry_time IS NOT NULL AND exit_time IS NULL',
        whereArgs: [vehiclePlate],
        orderBy: 'entry_time DESC',
        limit: 1,
      );

      return result.isNotEmpty ? result.first : null;
    } catch (e) {
      _logger.w('Error finding local entry record', error: e);
      return null;
    }
  }

  Map<String, dynamic>? _constructEntryFromQRData(
      Map<String, dynamic> qrGuestData) {
    try {
      // Construct entry data from QR token data
      final issuedAt = qrGuestData['issued_at'] as DateTime?;
      if (issuedAt == null) return null;

      return {
        'gate_check_id': 'CROSS_DEVICE_ENTRY',
        'vehicle_plate': qrGuestData['vehicle_plate'],
        'driver_name': qrGuestData['name'],
        'entry_time': issuedAt.millisecondsSinceEpoch,
        'estimated_weight': qrGuestData['estimated_weight'] ?? 0.0,
        'source': 'QR_CROSS_DEVICE',
        'original_device': qrGuestData['device_bound'] ?? 'unknown',
      };
    } catch (e) {
      _logger.w('Error constructing entry from QR data', error: e);
      return null;
    }
  }

  // ignore: unused_element
  Future<String> _getCurrentDeviceId() async {
    return await DeviceService.getDeviceId();
  }

  /// Create exit record for gate check with username tracking
  Future<String> createExitRecord({
    required String vehiclePlate,
    required String driverName,
    required String posNumber,
    required Map<String, dynamic>? entryReference,
    required QRScanData qrGuestData,
    double? actualWeight,
    String? secondCargo,
    String? notes,
    required String createdBy,
  }) async {
    try {
      _logger.i('Creating exit record for vehicle: $vehiclePlate');
      final normalizedSecondCargo = secondCargo?.trim();

      // Create guest log exit data
      final now = DateTime.now();
      final guestLogExitData = {
        'driver_name': driverName,
        'vehicle_plate': vehiclePlate,
        'vehicle_type': qrGuestData.vehicleType ??
            entryReference?['vehicle_type'] ??
            'Lainnya',
        'destination': 'Exit Processing',
        'gate_position': posNumber,
        'created_by': createdBy,
        'notes': notes,
        'second_cargo':
            (normalizedSecondCargo != null && normalizedSecondCargo.isNotEmpty)
                ? normalizedSecondCargo
                : null,
        'generation_intent': 'EXIT',
        'entry_time': null,
        'exit_time': now.millisecondsSinceEpoch,
        'registration_source': 'QR_SCAN',
      };

      // Save exit record to database with createdBy for audit trail
      final exitId = await _db.createGuestLog(guestLogExitData);

      // If there's an entry reference, update it to mark as completed
      final isSyntheticCrossDeviceEntry =
          entryReference?['gate_check_id'] == 'CROSS_DEVICE_ENTRY';
      final entryGuestId = entryReference?['guest_id']?.toString();

      if (!isSyntheticCrossDeviceEntry &&
          entryGuestId != null &&
          entryGuestId.isNotEmpty) {
        await _db.updateGuestLogExit(entryGuestId, {
          'actual_weight': actualWeight,
          'exit_notes': notes,
          'updated_by': createdBy,
          'username': createdBy, // Track who processed the exit
        });
      } else if (!isSyntheticCrossDeviceEntry) {
        _logger.w(
          'Entry reference found but guest_id is missing; skip entry close update',
        );
      }

      _logger.i('Exit record created successfully: $exitId');

      return exitId;
    } catch (e) {
      _logger.e('Failed to create exit record for $vehiclePlate', error: e);
      rethrow;
    }
  }
}
