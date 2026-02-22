import 'dart:async';
import 'dart:convert';
import 'package:logger/logger.dart';
import 'package:dart_jsonwebtoken/dart_jsonwebtoken.dart';
import 'package:crypto/crypto.dart';

import '../database/enhanced_database_service.dart';
import '../graphql/graphql_client.dart';
import '../graphql/gate_check_queries.dart';
import 'jwt_storage_service.dart';
import 'connectivity_service.dart';
import 'device_service.dart';

/// Intent-Based QR Service for Cross-Device Gate Check Operations
/// 
/// Core Features:
/// - Intent-Based QR generation (ENTRY/EXIT logic)
/// - Cross-device QR scanning validation
/// - Single-use token enforcement
/// - Offline-capable JWT-signed tokens
/// - Real-time synchronization with GraphQL
/// - Device binding and trust management
class IntentBasedQRService {
  static final Logger _logger = Logger();

  final EnhancedDatabaseService _db;
  final AgroGraphQLClient _graphqlClient;
  final JWTStorageService _jwtStorage;
  final ConnectivityService _connectivity;

  // Intent-based QR configuration
  static const Duration _qrTokenExpiry = Duration(hours: 24);
  static const String _qrIssuer = 'agrinova-gate-system';

  // QR token state management
  final Map<String, QRTokenData> _activeTokens = {};
  final StreamController<QREvent> _qrEventController = StreamController.broadcast();
  Timer? _tokenCleanupTimer;

  IntentBasedQRService({
    required EnhancedDatabaseService database,
    required AgroGraphQLClient graphqlClient,
    required JWTStorageService jwtStorage,
    required ConnectivityService connectivity,
  }) : _db = database,
       _graphqlClient = graphqlClient,
       _jwtStorage = jwtStorage,
       _connectivity = connectivity {
    _initializeService();
  }
  
  /// Initialize Intent-Based QR service
  void _initializeService() {
    _logger.i('Initializing Intent-Based QR service...');
    
    // Setup periodic token cleanup
    _tokenCleanupTimer = Timer.periodic(const Duration(minutes: 10), (_) {
      _cleanupExpiredTokens();
    });
    
    // Load active tokens from database
    _loadActiveTokensFromDatabase();
    
    _logger.i('Intent-Based QR service initialized');
  }
  
  /// Generate Intent-Based QR token
  Future<QRGenerationResult> generateQRToken({
    required String generationIntent, // 'ENTRY' or 'EXIT'
    required String guestName,
    required String guestCompany,
    required String vehiclePlate,
    required String vehicleType,
    required String destination,
    String? notes,
  }) async {
    try {
      _logger.d('Generating QR token with intent: $generationIntent');
      
      // Validate intent
      if (!_isValidIntent(generationIntent)) {
        throw Exception('Invalid generation intent: $generationIntent');
      }
      
      // Get device information
      final deviceId = await DeviceService.getDeviceId();
      final deviceFingerprint = await DeviceService.getDeviceFingerprint();
      
      // Create token data
      final tokenId = _generateTokenId();
      final tokenData = QRTokenData(
        tokenId: tokenId,
        generationIntent: generationIntent,
        allowedScan: _getOppositeIntent(generationIntent),
        guestName: guestName,
        guestCompany: guestCompany,
        vehiclePlate: vehiclePlate,
        vehicleType: vehicleType,
        destination: destination,
        notes: notes,
        generatedAt: DateTime.now(),
        expiresAt: DateTime.now().add(_qrTokenExpiry),
        generatedBy: await _getCurrentUserId(),
        deviceId: deviceId,
        deviceFingerprint: deviceFingerprint,
        status: QRTokenStatus.active,
        crossDeviceEnabled: true,
        singleUse: true,
      );
      
      // Store locally first (offline-first)
      await _storeTokenLocally(tokenData);
      
      // Generate JWT-signed QR data
      final jwtToken = await _generateJWTToken(tokenData);
      final qrData = _createQRData(tokenData, jwtToken);
      
      // Cache active token
      _activeTokens[tokenId] = tokenData;
      
      // Emit QR generation event
      _emitQREvent(QREvent(
        type: QREventType.tokenGenerated,
        tokenId: tokenId,
        data: tokenData.toMap(),
        timestamp: DateTime.now(),
      ));
      
      // Sync with server if online
      if (_connectivity.isOnline) {
        _syncTokenGenerationToServer(tokenData, jwtToken);
      }
      
      return QRGenerationResult(
        success: true,
        tokenId: tokenId,
        qrData: qrData,
        jwtToken: jwtToken,
        tokenData: tokenData,
        offlineCapable: true,
        crossDeviceEnabled: true,
        expiresAt: tokenData.expiresAt,
      );
      
    } catch (e) {
      _logger.e('Failed to generate QR token', error: e);
      return QRGenerationResult(
        success: false,
        error: e.toString(),
      );
    }
  }
  
  /// Validate and scan Intent-Based QR token
  Future<QRValidationResult> validateQRToken({
    required String qrData,
    required String scanIntent, // 'ENTRY' or 'EXIT'
    String? scannerLocation,
  }) async {
    try {
      _logger.d('Validating QR token with scan intent: $scanIntent');
      
      // Parse QR data
      final parsedData = _parseQRData(qrData);
      if (parsedData == null) {
        throw Exception('Invalid QR data format');
      }
      
      // Verify JWT signature
      final jwtData = await _verifyJWTToken(parsedData['jwt_token']);
      if (jwtData == null) {
        throw Exception('Invalid or expired JWT token');
      }
      
      final tokenId = jwtData['token_id'] as String;
      final generationIntent = jwtData['generation_intent'] as String;
      final allowedScan = jwtData['allowed_scan'] as String;
      
      // Validate Intent-Based logic
      if (scanIntent != allowedScan) {
        throw Exception('Intent mismatch: Generated for $generationIntent, requires $allowedScan scan, attempted $scanIntent');
      }
      
      // Check if token is already used (single-use enforcement)
      final existingValidation = await _checkTokenUsage(tokenId);
      if (existingValidation != null) {
        throw Exception('Token already used at ${existingValidation['used_at']}');
      }
      
      // Get scanner device info
      final scannerDeviceId = await DeviceService.getDeviceId();
      final generatorDeviceId = jwtData['device_id'] as String?;
      final isCrossDevice = scannerDeviceId != generatorDeviceId;
      
      // Create validation record
      final validationData = QRValidationData(
        tokenId: tokenId,
        scanIntent: scanIntent,
        generationIntent: generationIntent,
        guestName: jwtData['driver_name'],
        guestCompany: jwtData['guest_company'],
        vehiclePlate: jwtData['vehicle_plate'],
        vehicleType: jwtData['vehicle_type'],
        destination: jwtData['destination'] ?? jwtData['purpose'],
        scannerDeviceId: scannerDeviceId,
        generatorDeviceId: generatorDeviceId,
        isCrossDevice: isCrossDevice,
        scannerLocation: scannerLocation,
        validatedAt: DateTime.now(),
        validatedBy: await _getCurrentUserId(),
      );
      
      // Store validation locally
      await _storeValidationLocally(validationData);
      
      // Mark token as used
      await _markTokenAsUsed(tokenId, validationData);
      
      // Remove from active tokens
      _activeTokens.remove(tokenId);
      
      // Emit validation event
      _emitQREvent(QREvent(
        type: QREventType.tokenValidated,
        tokenId: tokenId,
        data: validationData.toMap(),
        timestamp: DateTime.now(),
      ));
      
      // Sync with server if online
      if (_connectivity.isOnline) {
        _syncValidationToServer(validationData);
      }
      
      return QRValidationResult(
        success: true,
        valid: true,
        tokenData: QRTokenData.fromJWTData(jwtData),
        validationData: validationData,
        crossDeviceValidation: isCrossDevice,
        singleUseEnforced: true,
      );
      
    } catch (e) {
      _logger.e('QR token validation failed', error: e);
      
      // Store failed validation for audit
      await _storeFaiedValidation(qrData, scanIntent, e.toString());
      
      return QRValidationResult(
        success: false,
        valid: false,
        error: e.toString(),
      );
    }
  }
  
  /// Generate unique token ID
  String _generateTokenId() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = (timestamp % 10000).toString().padLeft(4, '0');
    return 'QRT-$timestamp-$random';
  }
  
  /// Get opposite intent for Intent-Based logic
  String _getOppositeIntent(String intent) {
    switch (intent.toUpperCase()) {
      case 'ENTRY':
        return 'EXIT';
      case 'EXIT':
        return 'ENTRY';
      default:
        throw ArgumentError('Invalid intent: $intent');
    }
  }
  
  /// Validate intent value
  bool _isValidIntent(String intent) {
    return ['ENTRY', 'EXIT'].contains(intent.toUpperCase());
  }
  
  /// Generate JWT token for QR data
  Future<String> _generateJWTToken(QRTokenData tokenData) async {
    try {
      final payload = {
        'token_id': tokenData.tokenId,
        'generation_intent': tokenData.generationIntent,
        'allowed_scan': tokenData.allowedScan,
        'driver_name': tokenData.guestName,
        'guest_company': tokenData.guestCompany,
        'vehicle_plate': tokenData.vehiclePlate,
        'vehicle_type': tokenData.vehicleType,
        'destination': tokenData.destination,
        'notes': tokenData.notes,
        'device_id': tokenData.deviceId,
        'device_fingerprint': tokenData.deviceFingerprint,
        'cross_device': tokenData.crossDeviceEnabled,
        'single_use': tokenData.singleUse,
        'iss': _qrIssuer,
        'iat': tokenData.generatedAt.millisecondsSinceEpoch ~/ 1000,
        'exp': tokenData.expiresAt.millisecondsSinceEpoch ~/ 1000,
      };
      
      // Get JWT secret from storage
      final jwtSecret = await _getJWTSecret();
      
      final jwt = JWT(payload);
      return jwt.sign(SecretKey(jwtSecret));
      
    } catch (e) {
      _logger.e('Failed to generate JWT token', error: e);
      rethrow;
    }
  }
  
  /// Verify JWT token signature and extract data
  Future<Map<String, dynamic>?> _verifyJWTToken(String jwtToken) async {
    try {
      final jwtSecret = await _getJWTSecret();
      final jwt = JWT.verify(jwtToken, SecretKey(jwtSecret));
      
      // Check expiration
      final exp = jwt.payload['exp'] as int;
      if (DateTime.now().millisecondsSinceEpoch ~/ 1000 > exp) {
        throw Exception('JWT token expired');
      }
      
      return jwt.payload;
      
    } catch (e) {
      _logger.e('JWT verification failed', error: e);
      return null;
    }
  }
  
  /// Create QR data string
  String _createQRData(QRTokenData tokenData, String jwtToken) {
    final qrData = {
      'type': 'agrinova_gate_qr',
      'version': '1.0',
      'token_id': tokenData.tokenId,
      'generation_intent': tokenData.generationIntent,
      'allowed_scan': tokenData.allowedScan,
      'driver_name': tokenData.guestName,
      'vehicle_plate': tokenData.vehiclePlate,
      'jwt_token': jwtToken,
      'generated_at': tokenData.generatedAt.toIso8601String(),
      'expires_at': tokenData.expiresAt.toIso8601String(),
    };
    
    return jsonEncode(qrData);
  }
  
  /// Parse QR data string
  Map<String, dynamic>? _parseQRData(String qrData) {
    try {
      final parsed = jsonDecode(qrData) as Map<String, dynamic>;
      
      // Validate QR data format
      if (parsed['type'] != 'agrinova_gate_qr') {
        throw Exception('Invalid QR type');
      }
      
      if (parsed['version'] != '1.0') {
        throw Exception('Unsupported QR version');
      }
      
      return parsed;
      
    } catch (e) {
      _logger.e('Failed to parse QR data', error: e);
      return null;
    }
  }
  
  /// Store token locally in database
  Future<void> _storeTokenLocally(QRTokenData tokenData) async {
    await _db.insert('gate_qr_tokens', {
      'token_id': tokenData.tokenId,
      'generation_intent': tokenData.generationIntent,
      'allowed_scan': tokenData.allowedScan,
      'driver_name': tokenData.guestName,
      'vehicle_plate': tokenData.vehiclePlate,
      'vehicle_type': tokenData.vehicleType,
      'purpose': tokenData.destination,
      'notes': tokenData.notes,
      'generated_at': tokenData.generatedAt.millisecondsSinceEpoch,
      'expires_at': tokenData.expiresAt.millisecondsSinceEpoch,
      'generated_by': tokenData.generatedBy,
      'device_id': tokenData.deviceId,
      'device_fingerprint': tokenData.deviceFingerprint,
      'status': tokenData.status.name,
      'cross_device_enabled': tokenData.crossDeviceEnabled ? 1 : 0,
      'single_use': tokenData.singleUse ? 1 : 0,
      'sync_status': 'PENDING',
      'created_at': DateTime.now().millisecondsSinceEpoch,
    });
  }
  
  /// Store validation locally in database
  Future<void> _storeValidationLocally(QRValidationData validationData) async {
    await _db.insert('gate_qr_validations', {
      'token_id': validationData.tokenId,
      'scan_intent': validationData.scanIntent,
      'generation_intent': validationData.generationIntent,
      'driver_name': validationData.guestName,
      'vehicle_plate': validationData.vehiclePlate,
      'vehicle_type': validationData.vehicleType,
      'purpose': validationData.destination,
      'scanner_device_id': validationData.scannerDeviceId,
      'generator_device_id': validationData.generatorDeviceId,
      'is_cross_device': validationData.isCrossDevice ? 1 : 0,
      'scanner_location': validationData.scannerLocation,
      'validated_at': validationData.validatedAt.millisecondsSinceEpoch,
      'validated_by': validationData.validatedBy,
      'sync_status': 'PENDING',
      'created_at': DateTime.now().millisecondsSinceEpoch,
    });
  }
  
  /// Check if token is already used
  Future<Map<String, dynamic>?> _checkTokenUsage(String tokenId) async {
    final result = await _db.query(
      'gate_qr_validations',
      where: 'token_id = ?',
      whereArgs: [tokenId],
      limit: 1,
    );
    
    return result.isNotEmpty ? result.first : null;
  }
  
  /// Mark token as used
  Future<void> _markTokenAsUsed(String tokenId, QRValidationData validationData) async {
    await _db.update(
      'gate_qr_tokens',
      {
        'status': QRTokenStatus.used.name,
        'used_at': validationData.validatedAt.millisecondsSinceEpoch,
        'used_by': validationData.validatedBy,
        'scanner_device_id': validationData.scannerDeviceId,
        'updated_at': DateTime.now().millisecondsSinceEpoch,
      },
      where: 'token_id = ?',
      whereArgs: [tokenId],
    );
  }
  
  /// Store failed validation for audit
  Future<void> _storeFaiedValidation(String qrData, String scanIntent, String error) async {
    await _db.insert('qr_validation_failures', {
      'qr_data_hash': sha256.convert(utf8.encode(qrData)).toString(),
      'scan_intent': scanIntent,
      'error_message': error,
      'scanner_device_id': await DeviceService.getDeviceId(),
      'attempted_at': DateTime.now().millisecondsSinceEpoch,
      'created_at': DateTime.now().millisecondsSinceEpoch,
    });
  }
  
  /// Get JWT secret from secure storage
  Future<String> _getJWTSecret() async {
    // In production, this should be a secure key derivation
    // For now, using a combination of device ID and stored secret
    final deviceId = await DeviceService.getDeviceId();
    final baseSecret = await _jwtStorage.getOfflineToken() ?? 'agrinova_default_qr_secret';
    
    return sha256.convert(utf8.encode('$deviceId:$baseSecret')).toString();
  }
  
  /// Get current user ID
  Future<String> _getCurrentUserId() async {
    // Implementation to get current user from JWT or storage
    return 'current_user_id'; // Placeholder
  }
  
  /// Sync token generation to server
  Future<void> _syncTokenGenerationToServer(QRTokenData tokenData, String jwtToken) async {
    try {
      final mutationOptions = GateCheckQueries.generateQRTokenOptions(
        generationIntent: tokenData.generationIntent,
        guestName: tokenData.guestName,
        guestCompany: tokenData.guestCompany,
        vehiclePlate: tokenData.vehiclePlate,
        vehicleType: tokenData.vehicleType,
        purpose: tokenData.destination,
        notes: tokenData.notes,
        deviceId: tokenData.deviceId,
      );
      
      final result = await _graphqlClient.mutate(mutationOptions);
      
      if (!result.hasException) {
        await _db.update(
          'gate_qr_tokens',
          {'sync_status': 'SYNCED', 'synced_at': DateTime.now().millisecondsSinceEpoch},
          where: 'token_id = ?',
          whereArgs: [tokenData.tokenId],
        );
      }
    } catch (e) {
      _logger.e('Failed to sync token generation to server', error: e);
    }
  }
  
  /// Sync validation to server
  Future<void> _syncValidationToServer(QRValidationData validationData) async {
    try {
      final mutationOptions = GateCheckQueries.validateQRTokenOptions(
        qrToken: validationData.tokenId,
        scanIntent: validationData.scanIntent,
        deviceId: validationData.scannerDeviceId,
        scannerLocation: validationData.scannerLocation,
      );
      
      final result = await _graphqlClient.mutate(mutationOptions);
      
      if (!result.hasException) {
        await _db.update(
          'gate_qr_validations',
          {'sync_status': 'SYNCED', 'synced_at': DateTime.now().millisecondsSinceEpoch},
          where: 'token_id = ?',
          whereArgs: [validationData.tokenId],
        );
      }
    } catch (e) {
      _logger.e('Failed to sync validation to server', error: e);
    }
  }
  
  /// Load active tokens from database
  Future<void> _loadActiveTokensFromDatabase() async {
    try {
      final now = DateTime.now().millisecondsSinceEpoch;
      final activeTokens = await _db.query(
        'gate_qr_tokens',
        where: 'status = ? AND expires_at > ?',
        whereArgs: [QRTokenStatus.active.name, now],
      );
      
      for (final tokenData in activeTokens) {
        final token = QRTokenData.fromDatabase(tokenData);
        _activeTokens[token.tokenId] = token;
      }
      
      _logger.d('Loaded ${_activeTokens.length} active QR tokens from database');
    } catch (e) {
      _logger.e('Failed to load active tokens from database', error: e);
    }
  }
  
  /// Clean up expired tokens
  void _cleanupExpiredTokens() {
    final now = DateTime.now();
    final expiredTokens = <String>[];
    
    for (final entry in _activeTokens.entries) {
      if (now.isAfter(entry.value.expiresAt)) {
        expiredTokens.add(entry.key);
      }
    }
    
    for (final tokenId in expiredTokens) {
      _activeTokens.remove(tokenId);
      
      // Update database
      _db.update(
        'gate_qr_tokens',
        {'status': QRTokenStatus.expired.name, 'updated_at': now.millisecondsSinceEpoch},
        where: 'token_id = ?',
        whereArgs: [tokenId],
      );
    }
    
    if (expiredTokens.isNotEmpty) {
      _logger.d('Cleaned up ${expiredTokens.length} expired QR tokens');
    }
  }
  
  /// Emit QR event
  void _emitQREvent(QREvent event) {
    if (!_qrEventController.isClosed) {
      _qrEventController.add(event);
    }
  }
  
  // Public API
  
  /// Get active tokens count
  int get activeTokensCount => _activeTokens.length;
  
  /// Get QR events stream
  Stream<QREvent> get qrEventsStream => _qrEventController.stream;
  
  /// Get active tokens list
  List<QRTokenData> getActiveTokens() => _activeTokens.values.toList();
  
  /// Check if token exists and is active
  bool isTokenActive(String tokenId) => _activeTokens.containsKey(tokenId);
  
  /// Get token data by ID
  QRTokenData? getTokenData(String tokenId) => _activeTokens[tokenId];
  
  /// Get QR validation history
  Future<List<QRValidationData>> getValidationHistory({int limit = 50}) async {
    final results = await _db.query(
      'gate_qr_validations',
      orderBy: 'validated_at DESC',
      limit: limit,
    );
    
    return results.map((data) => QRValidationData.fromDatabase(data)).toList();
  }
  
  /// Get token generation history
  Future<List<QRTokenData>> getTokenHistory({int limit = 50}) async {
    final results = await _db.query(
      'qr_tokens',
      orderBy: 'generated_at DESC',
      limit: limit,
    );
    
    return results.map((data) => QRTokenData.fromDatabase(data)).toList();
  }
  
  /// Force sync pending QR operations
  Future<void> forceSyncQROperations() async {
    if (!_connectivity.isOnline) {
      throw Exception('No internet connection available');
    }
    
    // Sync pending token generations
    final pendingTokens = await _db.query(
      'qr_tokens',
      where: 'sync_status = ?',
      whereArgs: ['PENDING'],
    );
    
    for (final tokenData in pendingTokens) {
      final token = QRTokenData.fromDatabase(tokenData);
      await _syncTokenGenerationToServer(token, ''); // JWT will be regenerated
    }
    
    // Sync pending validations
    final pendingValidations = await _db.query(
      'gate_qr_validations',
      where: 'sync_status = ?',
      whereArgs: ['PENDING'],
    );
    
    for (final validationData in pendingValidations) {
      final validation = QRValidationData.fromDatabase(validationData);
      await _syncValidationToServer(validation);
    }
  }
  
  /// Dispose resources
  Future<void> dispose() async {
    try {
      _tokenCleanupTimer?.cancel();
      
      if (!_qrEventController.isClosed) {
        await _qrEventController.close();
      }
      
      _activeTokens.clear();
      
      _logger.i('Intent-Based QR service disposed');
    } catch (e) {
      _logger.e('Error disposing Intent-Based QR service', error: e);
    }
  }
}

/// QR Token Data Model
class QRTokenData {
  final String tokenId;
  final String generationIntent;
  final String allowedScan;
  final String guestName;
  final String guestCompany;
  final String vehiclePlate;
  final String vehicleType;
  final String destination;
  final String? notes;
  final DateTime generatedAt;
  final DateTime expiresAt;
  final String generatedBy;
  final String deviceId;
  final String deviceFingerprint;
  final QRTokenStatus status;
  final bool crossDeviceEnabled;
  final bool singleUse;
  final DateTime? usedAt;
  final String? usedBy;
  
  const QRTokenData({
    required this.tokenId,
    required this.generationIntent,
    required this.allowedScan,
    required this.guestName,
    required this.guestCompany,
    required this.vehiclePlate,
    required this.vehicleType,
    required this.destination,
    this.notes,
    required this.generatedAt,
    required this.expiresAt,
    required this.generatedBy,
    required this.deviceId,
    required this.deviceFingerprint,
    required this.status,
    required this.crossDeviceEnabled,
    required this.singleUse,
    this.usedAt,
    this.usedBy,
  });
  
  factory QRTokenData.fromDatabase(Map<String, dynamic> data) {
    return QRTokenData(
      tokenId: data['token_id'],
      generationIntent: data['generation_intent'],
      allowedScan: data['allowed_scan'],
      guestName: data['driver_name'],
      guestCompany: data['guest_company'],
      vehiclePlate: data['vehicle_plate'],
      vehicleType: data['vehicle_type'],
      destination: data['destination'] ?? data['purpose'],
      notes: data['notes'],
      generatedAt: DateTime.fromMillisecondsSinceEpoch(data['generated_at']),
      expiresAt: DateTime.fromMillisecondsSinceEpoch(data['expires_at']),
      generatedBy: data['generated_by'],
      deviceId: data['device_id'],
      deviceFingerprint: data['device_fingerprint'],
      status: QRTokenStatus.values.firstWhere((s) => s.name == data['status']),
      crossDeviceEnabled: data['cross_device_enabled'] == 1,
      singleUse: data['single_use'] == 1,
      usedAt: data['used_at'] != null ? DateTime.fromMillisecondsSinceEpoch(data['used_at']) : null,
      usedBy: data['used_by'],
    );
  }
  
  factory QRTokenData.fromJWTData(Map<String, dynamic> jwtData) {
    return QRTokenData(
      tokenId: jwtData['token_id'],
      generationIntent: jwtData['generation_intent'],
      allowedScan: jwtData['allowed_scan'],
      guestName: jwtData['driver_name'],
      guestCompany: jwtData['guest_company'],
      vehiclePlate: jwtData['vehicle_plate'],
      vehicleType: jwtData['vehicle_type'],
      destination: jwtData['destination'] ?? jwtData['purpose'],
      notes: jwtData['notes'],
      generatedAt: DateTime.fromMillisecondsSinceEpoch((jwtData['iat'] as int) * 1000),
      expiresAt: DateTime.fromMillisecondsSinceEpoch((jwtData['exp'] as int) * 1000),
      generatedBy: 'jwt_user',
      deviceId: jwtData['device_id'],
      deviceFingerprint: jwtData['device_fingerprint'],
      status: QRTokenStatus.active,
      crossDeviceEnabled: jwtData['cross_device'] ?? true,
      singleUse: jwtData['single_use'] ?? true,
    );
  }
  
  Map<String, dynamic> toMap() {
    return {
      'token_id': tokenId,
      'generation_intent': generationIntent,
      'allowed_scan': allowedScan,
      'driver_name': guestName,
      'guest_company': guestCompany,
      'vehicle_plate': vehiclePlate,
      'vehicle_type': vehicleType,
      'destination': destination,
      'notes': notes,
      'generated_at': generatedAt.toIso8601String(),
      'expires_at': expiresAt.toIso8601String(),
      'generated_by': generatedBy,
      'device_id': deviceId,
      'status': status.name,
      'cross_device_enabled': crossDeviceEnabled,
      'single_use': singleUse,
      'used_at': usedAt?.toIso8601String(),
      'used_by': usedBy,
    };
  }
}

/// QR Validation Data Model
class QRValidationData {
  final String tokenId;
  final String scanIntent;
  final String generationIntent;
  final String guestName;
  final String guestCompany;
  final String vehiclePlate;
  final String vehicleType;
  final String destination;
  final String scannerDeviceId;
  final String? generatorDeviceId;
  final bool isCrossDevice;
  final String? scannerLocation;
  final DateTime validatedAt;
  final String validatedBy;
  
  const QRValidationData({
    required this.tokenId,
    required this.scanIntent,
    required this.generationIntent,
    required this.guestName,
    required this.guestCompany,
    required this.vehiclePlate,
    required this.vehicleType,
    required this.destination,
    required this.scannerDeviceId,
    this.generatorDeviceId,
    required this.isCrossDevice,
    this.scannerLocation,
    required this.validatedAt,
    required this.validatedBy,
  });
  
  factory QRValidationData.fromDatabase(Map<String, dynamic> data) {
    return QRValidationData(
      tokenId: data['token_id'],
      scanIntent: data['scan_intent'],
      generationIntent: data['generation_intent'],
      guestName: data['driver_name'],
      guestCompany: data['guest_company'],
      vehiclePlate: data['vehicle_plate'],
      vehicleType: data['vehicle_type'],
      destination: data['destination'] ?? data['purpose'],
      scannerDeviceId: data['scanner_device_id'],
      generatorDeviceId: data['generator_device_id'],
      isCrossDevice: data['is_cross_device'] == 1,
      scannerLocation: data['scanner_location'],
      validatedAt: DateTime.fromMillisecondsSinceEpoch(data['validated_at']),
      validatedBy: data['validated_by'],
    );
  }
  
  Map<String, dynamic> toMap() {
    return {
      'token_id': tokenId,
      'scan_intent': scanIntent,
      'generation_intent': generationIntent,
      'driver_name': guestName,
      'guest_company': guestCompany,
      'vehicle_plate': vehiclePlate,
      'vehicle_type': vehicleType,
      'destination': destination,
      'scanner_device_id': scannerDeviceId,
      'generator_device_id': generatorDeviceId,
      'is_cross_device': isCrossDevice,
      'scanner_location': scannerLocation,
      'validated_at': validatedAt.toIso8601String(),
      'validated_by': validatedBy,
    };
  }
}

/// QR Generation Result
class QRGenerationResult {
  final bool success;
  final String? tokenId;
  final String? qrData;
  final String? jwtToken;
  final QRTokenData? tokenData;
  final bool? offlineCapable;
  final bool? crossDeviceEnabled;
  final DateTime? expiresAt;
  final String? error;
  
  const QRGenerationResult({
    required this.success,
    this.tokenId,
    this.qrData,
    this.jwtToken,
    this.tokenData,
    this.offlineCapable,
    this.crossDeviceEnabled,
    this.expiresAt,
    this.error,
  });
}

/// QR Validation Result
class QRValidationResult {
  final bool success;
  final bool? valid;
  final QRTokenData? tokenData;
  final QRValidationData? validationData;
  final bool? crossDeviceValidation;
  final bool? singleUseEnforced;
  final String? error;
  
  const QRValidationResult({
    required this.success,
    this.valid,
    this.tokenData,
    this.validationData,
    this.crossDeviceValidation,
    this.singleUseEnforced,
    this.error,
  });
}

/// QR Event for real-time updates
class QREvent {
  final QREventType type;
  final String tokenId;
  final Map<String, dynamic> data;
  final DateTime timestamp;
  
  const QREvent({
    required this.type,
    required this.tokenId,
    required this.data,
    required this.timestamp,
  });
}

/// QR Event Types
enum QREventType {
  tokenGenerated,
  tokenValidated,
  tokenExpired,
  tokenUsed,
  validationFailed,
}

/// QR Token Status
enum QRTokenStatus {
  active,
  used,
  expired,
  revoked,
}


