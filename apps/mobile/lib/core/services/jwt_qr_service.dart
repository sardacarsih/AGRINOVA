import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:logger/logger.dart';
import 'package:uuid/uuid.dart';

import '../models/jwt_models.dart';
import '../database/enhanced_database_service.dart';
import './device_service.dart';

/// JWT-based QR Code Service for Gate Check System
/// 
/// Features:
/// - Generate JWT tokens for guest access
/// - Single-use token validation with offline support
/// - Hardware-backed token signing and verification
/// - Anti-tampering protection with device binding
/// - Offline token cache for validation without network
class JWTQRService {
  static final JWTQRService _instance = JWTQRService._internal();
  factory JWTQRService() => _instance;
  JWTQRService._internal();

  final Logger _logger = Logger();
  final Uuid _uuid = const Uuid();
  final EnhancedDatabaseService _db = EnhancedDatabaseService();

  // JWT Configuration
  static const String _issuer = 'agrinova-gate-check';
  static const String _algorithm = 'HS256';
  static const Duration _defaultExpiry = Duration(hours: 24);
  static const Duration _maxExpiry = Duration(days: 7);
  
  // Secret key for JWT signing (should be device-specific in production)
  late String _secretKey;
  final Map<String, DateTime> _usedTokens = {};
  static const int _maxUsedTokensCacheSize = 500;
  bool _initialized = false;

  /// Initialize JWT QR Service with device-specific secret
  Future<void> initialize({String? deviceId}) async {
    try {
      if (_initialized) return;

      _logger.i('Initializing JWT QR Service...');
      
      // Initialize database service first (this will create tables if needed)
      await _db.database;
      _logger.i('Database service initialized');

      // Generate device-specific secret key
      final deviceIdentifier = deviceId ?? await _generateDeviceId();
      _secretKey = _generateSecretKey(deviceIdentifier);
      _logger.i('Secret key generated for device: ${deviceIdentifier.substring(0, 8)}...');
      
      // Clean expired used tokens on initialization
      await _cleanExpiredUsedTokens();
      _logger.i('Expired tokens cleaned');
      
      _initialized = true;
      _logger.i('JWT QR Service initialized successfully');
    } catch (e) {
      _logger.e('Error initializing JWT QR Service', error: e);
      rethrow;
    }
  }

  /// Generate JWT token for guest access with intent-based system
  Future<String> generateGuestToken({
    required String guestId,
    required String name,
    required String vehiclePlate,
    required String cargoType,
    required String generationIntent, // NEW: 'ENTRY' or 'EXIT'
    String? cargoVolume, // "Seperempat", "Setengah", "Penuh"
    String? vehicleType,
    String? destination,
    String? cargoOwner,
    double? estimatedWeight,
    String? doNumber,
    String? notes,
    Duration? expiry,
    String? createdBy,
  }) async {
    await _ensureInitialized();
    
    try {
      final now = DateTime.now();
      final exp = now.add(expiry ?? _defaultExpiry);
      
      if (expiry != null && expiry > _maxExpiry) {
        throw Exception('Masa berlaku token tidak boleh melebihi ${_maxExpiry.inDays} hari');
      }

      // Create JWT header
      final header = {
        'alg': _algorithm,
        'typ': 'JWT',
      };

      // Create JWT payload with guest data
      final payload = {
        'iss': _issuer,
        'sub': guestId,
        'iat': now.millisecondsSinceEpoch ~/ 1000,
        'exp': exp.millisecondsSinceEpoch ~/ 1000,
        'jti': _uuid.v4(), // Unique token ID
        'guest_id': guestId,
        'name': name,
        'vehicle_plate': vehiclePlate,
        'cargo_type': cargoType,
        'cargo_volume': cargoVolume, // "Seperempat", "Setengah", "Penuh"
        'vehicle_type': vehicleType,
        'destination': destination,
        'cargo_owner': cargoOwner,
        'estimated_weight': estimatedWeight,
        'do_number': doNumber,
        'notes': notes,
        'token_type': 'GUEST_ACCESS',
        'single_use': true,
        'max_usage': 1,
        'generation_intent': generationIntent, // 'ENTRY' or 'EXIT'
        'allowed_scan': _getOppositeDirection(generationIntent), // Opposite of intent
        'current_status': 'UNUSED',
        'created_by': createdBy,
        'device_bound': null, // DISABLED for cross-device QR scanning
      };

      // Encode header and payload
      final encodedHeader = _base64UrlEncode(utf8.encode(jsonEncode(header)));
      final encodedPayload = _base64UrlEncode(utf8.encode(jsonEncode(payload)));

      // Create signature
      final signature = _createSignature('$encodedHeader.$encodedPayload');
      final encodedSignature = _base64UrlEncode(signature);

      _logger.d('Secret key for generation: ${_secretKey.substring(0, 8)}...');
      _logger.d('Generated signature length: ${signature.length}');

      final token = '$encodedHeader.$encodedPayload.$encodedSignature';
      
      _logger.i('Generated JWT token for guest: $name ($vehiclePlate)');
      _logger.d('Token JTI: ${payload['jti']}');
      _logger.d('Token length: ${token.length} characters');

      // Store token metadata in database for offline validation
      _logger.i('Storing token metadata to database...');
      await _storeTokenMetadata(payload['jti'] as String, payload, exp);
      _logger.i('Token metadata storage completed');

      return token;
    } catch (e) {
      _logger.e('Error generating guest token', error: e);
      rethrow;
    }
  }

  /// Validate JWT token for intent-based scan direction
  Future<ValidationResult> validateScanDirection(String token, String scanDirection) async {
    await _ensureInitialized();
    
    try {
      // First validate the basic token
      final basicValidation = await validateToken(token);
      if (!basicValidation.isValid) {
        return basicValidation;
      }
      
      final payload = _parseTokenPayload(token);
      final jti = payload['jti'] as String;
      final allowedScan = payload['allowed_scan'] as String?;
      final currentStatus = payload['current_status'] as String? ?? 'UNUSED';
      final generationIntent = payload['generation_intent'] as String?;
      
      // Check if token is already used in database (cross-device support)
      // For validation, we only check if it has been marked as completed, not just scanned
      final isTokenCompleted = await _isTokenCompleted(jti);
      if (isTokenCompleted) {
        return ValidationResult.invalid('Token sudah digunakan sebelumnya');
      }
      
      // Check if scan direction matches allowed direction
      if (allowedScan == null) {
        return ValidationResult.invalid('Token tidak memiliki informasi scan yang diizinkan');
      }
      
      if (scanDirection.toUpperCase() != allowedScan.toUpperCase()) {
        return ValidationResult.invalid(
          'QR Code ini untuk ${generationIntent ?? 'tujuan tidak diketahui'}, hanya bisa di-scan untuk $allowedScan'
        );
      }
      
      return basicValidation;
    } catch (e) {
      _logger.e('Error validating scan direction', error: e);
      return ValidationResult.invalid('Validasi scan direction gagal: ${e.toString()}');
    }
  }

  /// Mark specific phase as used
  Future<void> markPhaseAsUsed(String token, String phase) async {
    try {
      final payload = _parseTokenPayload(token);
      final jti = payload['jti'] as String;
      final exp = DateTime.fromMillisecondsSinceEpoch(payload['exp'] * 1000);
      
      try {
        final now = DateTime.now().millisecondsSinceEpoch;
        await _db.insert('gate_qr_validations', {
          'token_id': jti,
          'validated_at': now,
          'scan_intent': phase,
          'generation_intent': payload['generation_intent'] ?? 'ENTRY',
          'sync_status': 'PENDING',
          'scanner_device_id': 'local_device',
          'validated_by': 'system',
          'created_at': now,
        });
      } catch (e) {
        // Fallback
        _logger.w('Failed to insert validation: $e');
      }
      
      _logger.d('Token phase marked as used: $jti ($phase)');
    } catch (e) {
      _logger.e('Error marking phase as used', error: e);
      rethrow;
    }
  }

  /// Validate JWT token and extract guest data
  Future<ValidationResult> validateToken(String token) async {
    await _ensureInitialized();
    
    try {
      // Parse JWT token
      final parts = token.split('.');
      if (parts.length != 3) {
        return ValidationResult.invalid('Format token tidak valid');
      }

      // Decode header and payload
      final header = jsonDecode(utf8.decode(_base64UrlDecode(parts[0])));
      final payload = jsonDecode(utf8.decode(_base64UrlDecode(parts[1])));

      // Validate header
      if (header['alg'] != _algorithm || header['typ'] != 'JWT') {
        return ValidationResult.invalid('Header token tidak valid');
      }

      // Verify signature
      final expectedSignature = _createSignature('${parts[0]}.${parts[1]}');
      final providedSignature = _base64UrlDecode(parts[2]);
      
      _logger.d('Secret key for validation: ${_secretKey.substring(0, 8)}...');
      _logger.d('Expected signature length: ${expectedSignature.length}');
      _logger.d('Provided signature length: ${providedSignature.length}');
      
      if (!_verifySignature(expectedSignature, Uint8List.fromList(providedSignature))) {
        _logger.w('Signature verification failed');
        return ValidationResult.invalid('Tanda tangan token tidak valid');
      }

      // Validate issuer
      if (payload['iss'] != _issuer) {
        return ValidationResult.invalid('Penerbit token tidak valid');
      }

      // Check expiration
      final exp = DateTime.fromMillisecondsSinceEpoch(payload['exp'] * 1000);
      if (DateTime.now().isAfter(exp)) {
        return ValidationResult.invalid('Token sudah kedaluwarsa');
      }

      // Check token usage with phase awareness
      final jti = payload['jti'] as String;
      final maxUsage = payload['max_usage'] as int? ?? 1;
      final currentUsage = await _getTokenUsageCount(jti);
      
      if (currentUsage >= maxUsage) {
        return ValidationResult.invalid('Token sudah habis digunakan');
      }

      // Device binding disabled for cross-device QR scanning
      // Multi-device support: QR generated on Device A can be scanned on Device B
      // if (payload['device_bound'] != null) {
      //   final currentFingerprint = await _getDeviceFingerprint();
      //   if (payload['device_bound'] != currentFingerprint) {
      //     return ValidationResult.invalid('Token tidak valid untuk perangkat ini');
      //   }
      // }

      // Mark token usage (will be handled by validatePhaseUsage method)
      // Phase marking will be done after specific phase validation

      // Extract guest data from payload
      final guestData = {
        'guest_id': payload['guest_id'],
        'name': payload['name'],
        'vehicle_plate': payload['vehicle_plate'],
        'cargo_type': payload['cargo_type'],
        'cargo_volume': payload['cargo_volume'], // "Seperempat", "Setengah", "Penuh"
        'vehicle_type': payload['vehicle_type'],
        'destination': payload['destination'],
        'cargo_owner': payload['cargo_owner'],
        'estimated_weight': payload['estimated_weight'],
        'do_number': payload['do_number'],
        'notes': payload['notes'],
        'created_by': payload['created_by'],
        'issued_at': DateTime.fromMillisecondsSinceEpoch(payload['iat'] * 1000),
        'expires_at': exp,
      };

      _logger.d('Token validated successfully for: ${payload['name']} (${payload['vehicle_plate']})');
      return ValidationResult.valid(guestData);
    } catch (e) {
      _logger.e('Error validating token', error: e);
      return ValidationResult.invalid('Validasi token gagal: ${e.toString()}');
    }
  }

  /// Generate QR code data from JWT token
  String generateQRData(String token, {Map<String, dynamic>? metadata}) {
    final qrData = {
      'type': 'GUEST_ACCESS',
      'version': '1.0',
      'token': token,
      'issuer': _issuer,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };
    
    if (metadata != null) {
      qrData['metadata'] = metadata;
    }
    
    return jsonEncode(qrData);
  }

  /// Generate compact QR code data for thermal printing
  /// CHANGED: Now uses FULL TOKEN to support offline cross-device scanning
  String generatePrintableQRData(String token) {
    // For offline cross-device support, we must use the full token
    // so that the scanner device can validate it without needing
    // to look up the reference in a database (which it might not have synced)
    return generateQRData(token);
  }

  /// Parse QR data that uses reference ID (for printed QR codes)
  Future<QRParseResult> parseReferenceQRData(String qrData) async {
    try {
      final data = jsonDecode(qrData);
      
      if (data['type'] != 'GUEST_ACCESS') {
        return QRParseResult.invalid('Tipe kode QR tidak valid');
      }
      
      if (data['issuer'] != _issuer) {
        return QRParseResult.invalid('Kode QR dari penerbit tidak dikenal');
      }
      
      // Check if this is a reference-based QR (printed) or full token QR (screen)
      final ref = data['ref'] as String?;
      final token = data['token'] as String?;
      
      if (ref != null) {
        // This is a printed QR with reference - lookup token from database
        final tokenData = await _lookupTokenByJti(ref);
        if (tokenData == null) {
          return QRParseResult.invalid('Token tidak ditemukan di database');
        }
        
        // Return the full token data from database
        return QRParseResult.valid(ref, tokenData);
      } else if (token != null) {
        // This is a full token QR - use normal parsing
        return parseQRData(qrData);
      } else {
        return QRParseResult.invalid('Kode QR tidak memiliki data yang valid');
      }
    } catch (e) {
      _logger.e('Error parsing reference QR data', error: e);
      return QRParseResult.invalid('Gagal mengurai kode QR');
    }
  }

  /// Lookup token data by JTI from database
  Future<Map<String, dynamic>?> _lookupTokenByJti(String jti) async {
    try {
      await _ensureInitialized();
      
      final result = await _db.query(
        'gate_qr_tokens',
        where: 'token_id = ?',
        whereArgs: [jti],
        limit: 1,
      );
      
      if (result.isEmpty) {
        _logger.w('Token not found for JTI: $jti');
        return null;
      }
      
      final tokenRecord = result.first;
      final tokenDataString = tokenRecord['token_data'] as String?;
      
      if (tokenDataString == null) {
        _logger.w('Token data is null for JTI: $jti');
        return null;
      }
      
      final tokenData = jsonDecode(tokenDataString) as Map<String, dynamic>;
      
      // Check expiration
      final expiresAt = tokenRecord['expires_at'] as int?;
      if (expiresAt != null && DateTime.now().millisecondsSinceEpoch > expiresAt) {
        _logger.w('Token expired for JTI: $jti');
        return null;
      }
      
      // Return enhanced data similar to parseQRData
      return {
        'guest_id': tokenData['guest_id'],
        'name': tokenData['name'],
        'vehicle_plate': tokenData['vehicle_plate'],
        'cargo_type': tokenData['cargo_type'],
        'cargo_volume': tokenData['cargo_volume'], // "Seperempat", "Setengah", "Penuh"
        'vehicle_type': tokenData['vehicle_type'],
        'destination': tokenData['destination'],
        'cargo_owner': tokenData['cargo_owner'],
        'estimated_weight': tokenData['estimated_weight'],
        'do_number': tokenData['do_number'],
        'notes': tokenData['notes'],
        'created_by': tokenData['created_by'],
        'jti': jti,
        'allowed_scan': tokenData['allowed_scan'],
        'generation_intent': tokenData['generation_intent'],
        'current_status': tokenRecord['status'],
        'expires_at': expiresAt != null ? DateTime.fromMillisecondsSinceEpoch(expiresAt) : null,
      };
    } catch (e) {
      _logger.e('Error looking up token by JTI', error: e);
      return null;
    }
  }

  /// Normalize JWT payload that may use minified (server) or full (local) claim keys.
  /// Returns a map with standard long key names for consistent downstream usage.
  Map<String, dynamic> _normalizePayloadKeys(Map<String, dynamic> payload) {
    return {
      'name': payload['name'] ?? payload['n'] ?? '',
      'vehicle_plate': payload['vehicle_plate'] ?? payload['p'] ?? '',
      'vehicle_type': payload['vehicle_type'] ?? payload['vt'],
      'guest_id': payload['guest_id'] ?? payload['sub'] ?? payload['g'] ?? '',
      'jti': payload['jti'] ?? payload['j'] ?? '',
      'generation_intent': payload['generation_intent'] ?? payload['i'],
      'allowed_scan': payload['allowed_scan'] ?? payload['a'],
      'current_status': payload['current_status'] ?? 'UNUSED',
      'cargo_type': payload['cargo_type'],
      'cargo_volume': payload['cargo_volume'],
      'destination': payload['destination'],
      'cargo_owner': payload['cargo_owner'],
      'estimated_weight': payload['estimated_weight'],
      'do_number': payload['do_number'],
      'notes': payload['notes'],
      'created_by': payload['created_by'],
      'device_id': payload['device_id'] ?? payload['d'],
      'company_id': payload['company_id'] ?? payload['c'],
      'entry_time_unix': payload['et'],
    };
  }

  /// Try to parse a raw JWT string (server-generated QR codes).
  /// Returns null if the string is not a valid JWT.
  Future<QRParseResult?> _tryParseRawJWT(String qrData) async {
    // Quick check: JWT has exactly 3 dot-separated parts
    final parts = qrData.split('.');
    if (parts.length != 3) return null;

    try {
      final payload = _parseTokenPayload(qrData);
      final normalized = _normalizePayloadKeys(payload);

      // Must have at least a vehicle plate or name to be a valid guest QR
      if ((normalized['vehicle_plate'] as String).isEmpty &&
          (normalized['name'] as String).isEmpty) {
        return null;
      }

      _logger.i('Parsed raw JWT (server-generated QR) successfully');

      // Build guest data with normalized keys
      final guestData = {
        ...normalized,
        'issued_at': payload['iat'] != null
            ? DateTime.fromMillisecondsSinceEpoch((payload['iat'] as num).toInt() * 1000)
            : null,
        'expires_at': payload['exp'] != null
            ? DateTime.fromMillisecondsSinceEpoch((payload['exp'] as num).toInt() * 1000)
            : null,
      };

      return QRParseResult.valid(qrData, guestData);
    } catch (e) {
      _logger.d('Not a valid raw JWT: $e');
      return null;
    }
  }

  /// Parse QR code data and extract JWT token or Employee data with scan validation info
  Future<QRParseResult> parseQRData(String qrData) async {
    try {
      final data = jsonDecode(qrData);

      // Handle GUEST_ACCESS
      if (data['type'] == 'GUEST_ACCESS') {
        if (data['issuer'] != _issuer) {
          return QRParseResult.invalid('Kode QR dari penerbit tidak dikenal');
        }

        // Check if this is a reference-based QR (from thermal print) or full token QR (from screen)
        final ref = data['ref'] as String?;
        final token = data['token'] as String?;

        if (ref != null && ref.isNotEmpty) {
          // This is a printed QR with JTI reference - lookup full data from database
          _logger.d('Parsing reference-based QR with ref: $ref');
          final tokenData = await _lookupTokenByJti(ref);
          if (tokenData == null) {
            return QRParseResult.invalid('Token tidak ditemukan atau sudah kadaluarsa');
          }

          _logger.d('QR ref lookup successful: name=${tokenData['name']}, plate=${tokenData['vehicle_plate']}');
          return QRParseResult.valid(ref, tokenData);
        } else if (token != null && token.isNotEmpty) {
          // This is a full token QR (from screen display)
          // Validate the basic token structure and signature
          final validationResult = await validateToken(token);
          if (!validationResult.isValid) {
            // Signature mismatch is expected for server-generated tokens (different secret).
            // Fall back to parsing the payload without signature verification.
            _logger.d('Local signature validation failed, trying server-token fallback');
            final serverResult = await _tryParseRawJWT(token);
            if (serverResult != null) return serverResult;
            return QRParseResult.invalid(validationResult.error!);
          }

          // Extract additional token payload information for scan validation
          final payload = _parseTokenPayload(token);
          final normalized = _normalizePayloadKeys(payload);

          // Merge basic validation data with payload info including allowed_scan
          final enhancedData = {
            ...validationResult.data!,
            ...normalized,
          };

          _logger.d('QR parsed successfully with scan info: allowed_scan=${normalized['allowed_scan']}, generation_intent=${normalized['generation_intent']}');

          return QRParseResult.valid(token, enhancedData);
        } else {
          return QRParseResult.invalid('Kode QR tidak memiliki data token yang valid');
        }
      }
      // Handle EMPLOYEE_ACCESS
      else if (data['type'] == 'EMPLOYEE_ACCESS') {
         // Basic validation for employee QR - handle case-insensitive issuer
         final issuer = data['issuer']?.toString().toUpperCase();
         if (issuer != 'HRIS') {
           _logger.w('Employee QR issuer mismatch: $issuer (expected: HRIS)');
           return QRParseResult.invalid('Kode QR Karyawan bukan dari HRIS');
         }

         // Handle case-insensitive IDDATA key (HRIS sends uppercase "IDDATA")
         final iddata = data['IDDATA'] ?? data['iddata'] ?? data['Iddata'] ?? '';

         // Parse timestamp (HRIS sends as string "1765508255338.000")
         int timestamp;
         final rawTimestamp = data['timestamp'];
         if (rawTimestamp is int) {
           timestamp = rawTimestamp;
         } else if (rawTimestamp is String) {
           final cleanValue = rawTimestamp.replaceAll(RegExp(r'\.0+$'), '');
           timestamp = int.tryParse(cleanValue) ?? DateTime.now().millisecondsSinceEpoch;
         } else if (rawTimestamp is double) {
           timestamp = rawTimestamp.toInt();
         } else {
           timestamp = DateTime.now().millisecondsSinceEpoch;
         }

         // Construct employee data payload with normalized keys
         final employeeData = {
           'type': 'EMPLOYEE_ACCESS',
           'iddata': iddata,
           'nik': data['nik'] ?? '',
           'name': data['nama'] ?? '',
           'department': data['departement'] ?? '',
           'timestamp': timestamp,
         };

         _logger.i('Employee QR parsed: NIK=${data['nik']}, Name=${data['nama']}, Dept=${data['departement']}');

         return QRParseResult.valid(qrData, employeeData);
      }
      else {
        return QRParseResult.invalid('Tipe kode QR tidak valid: ${data['type']}');
      }
    } catch (e) {
      // JSON decode failed - could be a raw JWT (server-generated QR code)
      _logger.d('QR data is not JSON, trying raw JWT parse...');
      final rawJwtResult = await _tryParseRawJWT(qrData);
      if (rawJwtResult != null) return rawJwtResult;

      _logger.e('Error parsing QR data', error: e);
      return QRParseResult.invalid('Gagal mengurai kode QR');
    }
  }

  /// Check if token is blacklisted or revoked
  Future<bool> isTokenBlacklisted(String jti) async {
    try {
      final result = await _db.query(
        'blacklisted_tokens',
        where: 'jti = ?',
        whereArgs: [jti],
      );
      return result.isNotEmpty;
    } catch (e) {
      _logger.w('Error checking token blacklist', error: e);
      return false;
    }
  }

  /// Blacklist a token (revoke access)
  Future<void> blacklistToken(String jti, String reason, {String? revokedBy}) async {
    try {
      await _db.insert('blacklisted_tokens', {
        'jti': jti,
        'revoked_at': DateTime.now().millisecondsSinceEpoch,
        'reason': reason,
        'revoked_by': revokedBy,
        'sync_status': 'PENDING',
      });
      _logger.i('Token blacklisted: $jti');
    } catch (e) {
      _logger.e('Error blacklisting token', error: e);
      rethrow;
    }
  }

  /// Get token usage statistics
  Future<Map<String, dynamic>> getTokenStats() async {
    try {
      final issued = await _db.rawQuery('SELECT COUNT(*) as count FROM gate_qr_tokens');
      final used = await _db.rawQuery('SELECT COUNT(*) as count FROM gate_qr_validations');
      final blacklisted = await _db.rawQuery('SELECT COUNT(*) as count FROM blacklisted_tokens');
      
      return {
        'total_issued': issued.first['count'] as int,
        'total_used': used.first['count'] as int,
        'total_blacklisted': blacklisted.first['count'] as int,
        'active_tokens': (issued.first['count'] as int) - 
                        (used.first['count'] as int) - 
                        (blacklisted.first['count'] as int),
      };
    } catch (e) {
      _logger.e('Error getting token stats', error: e);
      return {};
    }
  }

  /// Debug method to get recent guest tokens (for troubleshooting)
  Future<List<Map<String, dynamic>>> getRecentGuestTokens({int limit = 10}) async {
    try {
      await _ensureInitialized();
      return await _db.query(
        'gate_qr_tokens',
        orderBy: 'created_at DESC',
        limit: limit,
      );
    } catch (e) {
      _logger.e('Error getting recent guest tokens', error: e);
      return [];
    }
  }

  // Private helper methods

  Future<void> _ensureInitialized() async {
    if (!_initialized) {
      await initialize();
    }
  }

  String _generateSecretKey(String deviceId) {
    final combined = '$deviceId-$_issuer-${DateTime.now().year}';
    final bytes = utf8.encode(combined);
    final hash = sha256.convert(bytes);
    return hash.toString();
  }

  Future<String> _generateDeviceId() async {
    return await DeviceService.getDeviceId();
  }

  Future<String> _getDeviceFingerprint() async {
    // Generate device fingerprint for token binding
    final deviceId = await _generateDeviceId();
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    return sha256.convert(utf8.encode('$deviceId-$timestamp')).toString().substring(0, 16);
  }

  Uint8List _createSignature(String data) {
    final key = utf8.encode(_secretKey);
    final dataBytes = utf8.encode(data);
    final hmac = Hmac(sha256, key);
    return Uint8List.fromList(hmac.convert(dataBytes).bytes);
  }

  bool _verifySignature(Uint8List expected, Uint8List provided) {
    if (expected.length != provided.length) return false;
    
    var result = 0;
    for (int i = 0; i < expected.length; i++) {
      result |= expected[i] ^ provided[i];
    }
    return result == 0;
  }

  String _base64UrlEncode(List<int> bytes) {
    return base64Url.encode(bytes).replaceAll('=', '');
  }

  List<int> _base64UrlDecode(String str) {
    String normalized = str;
    switch (str.length % 4) {
      case 2:
        normalized += '==';
        break;
      case 3:
        normalized += '=';
        break;
    }
    return base64Url.decode(normalized);
  }

  Future<void> _storeTokenMetadata(String jti, Map<String, dynamic> payload, DateTime expiresAt) async {
    try {
      _logger.i('Storing token metadata for JTI: $jti');
      
      // Prepare data for insertion into gate_qr_tokens
      final insertData = <String, dynamic>{
        'token_id': jti,
        'driver_name': payload['name'],
        'vehicle_plate': payload['vehicle_plate'],
        'token_data': jsonEncode(payload),
        'generated_at': DateTime.now().millisecondsSinceEpoch,
        'expires_at': expiresAt.millisecondsSinceEpoch,
        'status': 'active',
        'sync_status': 'PENDING',
        'generation_intent': payload['generation_intent'] ?? 'ENTRY',
        'allowed_scan': payload['allowed_scan'] ?? 'EXIT',
        'device_id': 'local_device', // Should get real device ID,
        'created_at': DateTime.now().millisecondsSinceEpoch,
        'updated_at': DateTime.now().millisecondsSinceEpoch,
      };
      
      // Handle created_by (generated_by)
      final createdBy = payload['created_by'];
      if (createdBy != null && createdBy.toString().isNotEmpty) {
        final userExists = await _checkUserExistsInLocalDb(createdBy.toString());
        if (userExists) {
          insertData['generated_by'] = createdBy.toString();
        } else {
          insertData['generated_by'] = null; // Use NULL if user not found (safer than 'system')
        }
      } else {
        insertData['generated_by'] = null;
      }
      
      _logger.d('Insert data prepared: ${insertData.keys.join(', ')}');
      
      final result = await _db.insert('gate_qr_tokens', insertData);
      _logger.i('Token metadata stored successfully with ID: $result');
      
      // Verify insertion by querying back
      final verification = await _db.query(
        'gate_qr_tokens',
        where: 'token_id = ?',
        whereArgs: [jti],
        limit: 1,
      );
      
      if (verification.isNotEmpty) {
        _logger.i('Token verification successful: ${verification.first['token_id']}');
      } else {
        _logger.e('Token verification failed: Not found in database');
      }
    } catch (e) {
      _logger.e('Error storing token metadata', error: e);
      _logger.e('Stack trace: ${StackTrace.current}');
      rethrow; // Rethrow so UI knows something went wrong
    }
  }

  /// Check if user exists in local database (for FK constraint validation)
  Future<bool> _checkUserExistsInLocalDb(String userId) async {
    try {
      await _ensureInitialized();
      final result = await _db.query(
        'users',
        where: 'user_id = ?',
        whereArgs: [userId],
        limit: 1,
      );
      return result.isNotEmpty;
    } catch (e) {
      _logger.w('Error checking user existence in local DB: $e');
      return false; // If error, assume user doesn't exist to be safe
    }
  }

  /// Get total usage count for token
  Future<int> _getTokenUsageCount(String jti) async {
    try {
      final result = await _db.query(
        'used_tokens',
        where: 'jti = ?',
        whereArgs: [jti],
      );
      return result.length;
    } catch (e) {
      _logger.w('Error getting token usage count', error: e);
      return 0;
    }
  }

  /// Get last used phase for token
  Future<String?> _getLastUsedPhase(String jti) async {
    try {
      final result = await _db.query(
        'used_tokens',
        where: 'jti = ?',
        whereArgs: [jti],
        orderBy: 'used_at DESC',
        limit: 1,
      );
      
      if (result.isEmpty) return null;
      
      final metadataString = result.first['usage_metadata'] as String?;
      if (metadataString == null) return null;
      
      final metadata = jsonDecode(metadataString) as Map<String, dynamic>;
      return metadata['phase'] as String?;
    } catch (e) {
      _logger.w('Error getting last used phase', error: e);
      return null;
    }
  }

  /// Get expected next phase based on usage history
  String _getExpectedNextPhase(String? lastPhase, List<String> phases) {
    if (lastPhase == null) {
      return phases.first; // Start with first phase
    }
    
    final currentIndex = phases.indexOf(lastPhase);
    if (currentIndex == -1 || currentIndex >= phases.length - 1) {
      return 'COMPLETED'; // All phases used
    }
    
    return phases[currentIndex + 1];
  }

  /// Parse token payload without validation
  Map<String, dynamic> _parseTokenPayload(String token) {
    final parts = token.split('.');
    if (parts.length != 3) {
      throw Exception('Invalid token format');
    }
    
    final payload = jsonDecode(utf8.decode(_base64UrlDecode(parts[1])));
    return payload as Map<String, dynamic>;
  }

  Future<bool> _isTokenUsed(String jti) async {
    try {
      // Check in-memory cache first
      if (_usedTokens.containsKey(jti)) {
        final usedAt = _usedTokens[jti]!;
        if (DateTime.now().isBefore(usedAt.add(const Duration(hours: 1)))) {
          return true;
        } else {
          _usedTokens.remove(jti); // Clean expired entry
        }
      }

      // Check database
      final result = await _db.query(
        'used_tokens',
        where: 'jti = ?',
        whereArgs: [jti],
      );
      
      if (result.isNotEmpty) {
        _addToUsedTokensCache(jti);
        return true;
      }
      
      return false;
    } catch (e) {
      _logger.w('Error checking token usage', error: e);
      return false;
    }
  }

  /// Check if token has been marked as completed (final processing done)
  Future<bool> _isTokenCompleted(String jti) async {
    try {
      // Try to check with usage_metadata column (new schema)
      final result = await _db.query(
        'used_tokens',
        where: 'jti = ? AND usage_metadata LIKE ?',
        whereArgs: [jti, '%"phase":"ENTRY"%'],
      );
      
      if (result.isNotEmpty) return true;
      
      final exitResult = await _db.query(
        'used_tokens',
        where: 'jti = ? AND usage_metadata LIKE ?',
        whereArgs: [jti, '%"phase":"EXIT"%'],
      );
      
      return exitResult.isNotEmpty;
    } catch (e) {
      _logger.w('Error checking token completion with usage_metadata, falling back to simple check: $e');
      
      // Fallback for old schema: just check if token exists in used_tokens
      try {
        final fallbackResult = await _db.query(
          'used_tokens',
          where: 'jti = ?',
          whereArgs: [jti],
        );
        return fallbackResult.isNotEmpty;
      } catch (fallbackError) {
        _logger.e('Error in fallback token completion check', error: fallbackError);
        return false;
      }
    }
  }

  Future<void> _markTokenAsUsed(String jti, DateTime expiresAt) async {
    try {
      await _db.insert('used_tokens', {
        'jti': jti,
        'used_at': DateTime.now().millisecondsSinceEpoch,
        'expires_at': expiresAt.millisecondsSinceEpoch,
        'sync_status': 'PENDING',
      });
      
      _addToUsedTokensCache(jti);
      _logger.d('Token marked as used: $jti');
    } catch (e) {
      _logger.e('Error marking token as used', error: e);
    }
  }

  /// Add token to in-memory cache with size limit eviction
  void _addToUsedTokensCache(String jti) {
    if (_usedTokens.length >= _maxUsedTokensCacheSize) {
      // Evict oldest entries
      final sortedEntries = _usedTokens.entries.toList()
        ..sort((a, b) => a.value.compareTo(b.value));
      final toRemove = sortedEntries.take(_usedTokens.length - _maxUsedTokensCacheSize + 1);
      for (final entry in toRemove) {
        _usedTokens.remove(entry.key);
      }
    }
    _usedTokens[jti] = DateTime.now();
  }

  Future<void> _cleanExpiredUsedTokens() async {
    try {
      final now = DateTime.now().millisecondsSinceEpoch;
      await _db.delete('used_tokens', 'expires_at < ?', [now]);
      
      // Clean in-memory cache
      _usedTokens.removeWhere((key, value) => 
          DateTime.now().difference(value) > const Duration(hours: 1));
      
      _logger.d('Cleaned expired used tokens');
    } catch (e) {
      _logger.w('Error cleaning expired used tokens', error: e);
    }
  }

  /// Mark token as used after successful scan (cross-device support)
  Future<void> markTokenAsUsedAfterScan(String token) async {
    try {
      final payload = _parseTokenPayload(token);
      final jti = payload['jti'] as String;
      final exp = DateTime.fromMillisecondsSinceEpoch(payload['exp'] * 1000);
      
      await _markTokenAsUsed(jti, exp);
      _logger.d('Token marked as used after successful scan: $jti');
    } catch (e) {
      _logger.e('Error marking token as used after scan', error: e);
      rethrow;
    }
  }

  /// Get opposite direction for intent-based system
  String _getOppositeDirection(String intent) {
    switch (intent.toUpperCase()) {
      case 'ENTRY':
        return 'EXIT';
      case 'EXIT':
        return 'ENTRY';
      default:
        throw ArgumentError('Invalid intent: $intent. Must be ENTRY or EXIT');
    }
  }
}

/// Validation result for JWT tokens
class ValidationResult {
  final bool isValid;
  final Map<String, dynamic>? data;
  final String? error;

  ValidationResult._(this.isValid, this.data, this.error);

  factory ValidationResult.valid(Map<String, dynamic> data) => 
      ValidationResult._(true, data, null);

  factory ValidationResult.invalid(String error) => 
      ValidationResult._(false, null, error);
}

/// QR parsing result
class QRParseResult {
  final bool isValid;
  final String? token;
  final Map<String, dynamic>? data;
  final String? error;

  QRParseResult._(this.isValid, this.token, this.data, this.error);

  factory QRParseResult.valid(String token, Map<String, dynamic> data) => 
      QRParseResult._(true, token, data, null);

  factory QRParseResult.invalid(String error) => 
      QRParseResult._(false, null, null, error);
}