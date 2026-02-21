import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:logger/logger.dart';

import '../routes/app_routes.dart';
import '../di/service_locator.dart';
import '../network/graphql_client_service.dart';
import 'notification_storage_service.dart';

class HarvestNotificationEvent {
  final String panenId;
  final String action;
  final String type;

  const HarvestNotificationEvent({
    required this.panenId,
    required this.action,
    required this.type,
  });
}

/// Background message handler - must be a top-level function
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint('Handling background message: ${message.messageId}');
}

/// FCM Service for handling Firebase Cloud Messaging
class FCMService {
  static final FCMService _instance = FCMService._internal();
  factory FCMService() => _instance;
  FCMService._internal();

  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  final Logger _logger = Logger();
  static final StreamController<HarvestNotificationEvent>
  _harvestNotificationController =
      StreamController<HarvestNotificationEvent>.broadcast();

  static Stream<HarvestNotificationEvent> get harvestNotificationStream =>
      _harvestNotificationController.stream;

  GraphQLClient? _graphqlClient;
  NotificationStorageService? _notificationStorage;
  Function(String panenId, String action)? _onHarvestNotification;

  bool _isAuthenticated = false;
  bool _isInitialized = false;

  StreamSubscription<RemoteMessage>? _onMessageSubscription;
  StreamSubscription<RemoteMessage>? _onMessageOpenedAppSubscription;
  StreamSubscription<String>? _onTokenRefreshSubscription;
  final Map<String, DateTime> _recentNotificationKeys = <String, DateTime>{};

  static const String _typeHarvestApprovalNeeded = 'HARVEST_APPROVAL_NEEDED';
  static const String _typeHarvestStatusUpdate = 'HARVEST_STATUS_UPDATE';
  static const String _typeHarvestEscalation = 'HARVEST_ESCALATION';
  static const String _typeHarvestSlaBreach = 'HARVEST_SLA_BREACH';
  static const String _typeHarvestPksUpdate = 'HARVEST_PKS_UPDATE';

  /// Initialize FCM service
  /// Note: Token registration is NOT done here. Call registerTokenIfAuthenticated() after login.
  Future<void> initialize({
    GraphQLClient? graphqlClient,
    Function(String panenId, String action)? onHarvestNotification,
  }) async {
    if (_isInitialized) {
      // Keep callback up to date, but avoid registering duplicate listeners.
      _onHarvestNotification = onHarvestNotification;
      _logger.d('FCM Service already initialized, skipping re-initialization');
      return;
    }

    if (graphqlClient != null) {
      _graphqlClient = graphqlClient;
    } else {
      try {
        final service = ServiceLocator.get<GraphQLClientService>();
        _graphqlClient = service.client;
      } catch (e) {
        _logger.w('Failed to get GraphQLClientService from ServiceLocator: $e');
      }
    }

    // Initialize notification storage
    try {
      _notificationStorage = ServiceLocator.get<NotificationStorageService>();
      await _notificationStorage!.initialize();
    } catch (e) {
      _logger.w(
        'Failed to get NotificationStorageService from ServiceLocator: $e',
      );
      try {
        _notificationStorage = NotificationStorageService();
        await _notificationStorage!.initialize();
      } catch (storageError) {
        _logger.w(
          'Failed to initialize NotificationStorageService: $storageError',
        );
      }
    }

    _onHarvestNotification = onHarvestNotification;

    // Request permission
    await _requestPermission();

    // Initialize local notifications
    await _initializeLocalNotifications();

    // Setup message handlers
    _setupMessageHandlers();

    // NOTE: Token registration is deferred until after authentication
    // Call registerTokenIfAuthenticated() after successful login

    // Listen for token refresh (will only send if authenticated)
    _onTokenRefreshSubscription ??= _fcm.onTokenRefresh.listen(_onTokenRefresh);

    _isInitialized = true;
    _logger.i('FCM Service initialized (token registration deferred)');
  }

  /// Register FCM token after successful authentication
  /// Call this method after the user logs in successfully
  Future<void> registerTokenIfAuthenticated() async {
    _isAuthenticated = true;
    await _registerToken();
  }

  /// Clear authentication state (call on logout)
  void clearAuthState() {
    _isAuthenticated = false;
  }

  /// Request notification permission
  Future<void> _requestPermission() async {
    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      announcement: false,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
    );

    _logger.i('FCM permission status: ${settings.authorizationStatus}');
  }

  /// Initialize local notifications plugin
  Future<void> _initializeLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings(
      '@mipmap/ic_launcher',
    );
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    await _localNotifications.initialize(
      settings: const InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      ),
      onDidReceiveNotificationResponse: _handleNotificationTap,
    );

    // Create notification channel for Android
    if (Platform.isAndroid) {
      await _createNotificationChannel();
    }
  }

  /// Create Android notification channel
  Future<void> _createNotificationChannel() async {
    const channel = AndroidNotificationChannel(
      'harvest_notifications',
      'Harvest Notifications',
      description: 'Notifications for harvest approval and status updates',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(channel);
  }

  /// Setup FCM message handlers
  void _setupMessageHandlers() {
    if (_onMessageSubscription != null ||
        _onMessageOpenedAppSubscription != null) {
      return;
    }

    // Foreground messages
    _onMessageSubscription = FirebaseMessaging.onMessage.listen(
      _handleForegroundMessage,
    );

    // Background/terminated -> opened app
    _onMessageOpenedAppSubscription = FirebaseMessaging.onMessageOpenedApp
        .listen(_handleMessageOpenedApp);

    // Check for initial message (app was terminated)
    _checkInitialMessage();
  }

  /// Check for message that launched the app
  Future<void> _checkInitialMessage() async {
    final initialMessage = await _fcm.getInitialMessage();
    if (initialMessage != null) {
      _handleMessageOpenedApp(initialMessage);
    }
  }

  /// Handle foreground message
  void _handleForegroundMessage(RemoteMessage message) {
    _logger.i('Foreground message received: ${message.messageId}');

    final data = message.data;
    final notification = message.notification;
    final title = notification?.title ?? data['title'] as String?;
    final body =
        notification?.body ??
        data['body'] as String? ??
        data['message'] as String?;

    if (!_shouldProcessIncomingNotification(data, title, body)) {
      _logger.d('Skipping duplicate incoming FCM notification');
      return;
    }

    // Show local notification and store only for user-visible messages.
    if (title != null || body != null) {
      _showLocalNotification(
        id: message.hashCode,
        title: title ?? 'Agrinova',
        body: body ?? '',
        payload: _buildNotificationPayload(data),
      );

      // Store notification locally
      _storeNotification(
        title: title ?? 'Agrinova',
        body: body ?? '',
        data: data,
      );
    }

    // Trigger callback for harvest notifications
    _triggerHarvestCallback(data);
  }

  /// Handle message when app is opened from background
  void _handleMessageOpenedApp(RemoteMessage message) {
    _logger.i('Message opened app: ${message.messageId}');

    final data = message.data;
    _navigateBasedOnPayload(data);
    _triggerHarvestCallback(data);
  }

  /// Handle notification tap from local notification
  void _handleNotificationTap(NotificationResponse response) {
    _logger.i('Notification tapped: ${response.payload}');

    final rawPayload = response.payload;
    if (rawPayload != null && rawPayload.isNotEmpty) {
      final payloadData = _parseNotificationPayload(rawPayload);
      _navigateBasedOnPayload(payloadData);
      _triggerHarvestCallback(payloadData);
    }
  }

  /// Show local notification
  Future<void> _showLocalNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    await _localNotifications.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          'harvest_notifications',
          'Harvest Notifications',
          channelDescription:
              'Notifications for harvest approval and status updates',
          importance: Importance.high,
          priority: Priority.high,
          showWhen: true,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: payload,
    );
  }

  /// Navigate based on notification payload
  void _navigateBasedOnPayload(Map<String, dynamic> data) {
    final type = (data['type'] as String? ?? '').toUpperCase();
    final action = (data['action'] as String? ?? '').toUpperCase();
    final panenId = _extractPanenId(data);
    final clickAction = data['click_action'] as String?;

    if (clickAction != null && clickAction.startsWith('/')) {
      _navigateToPath(
        clickAction,
        panenId: panenId,
        action: action,
        type: type,
      );
      return;
    }

    switch (type) {
      case _typeHarvestApprovalNeeded:
        if (panenId != null) {
          _navigateToApproval(panenId);
        } else {
          _navigateToAsistenDashboard();
        }
        break;
      case _typeHarvestStatusUpdate:
        if (action == 'APPROVED' ||
            action == 'PKS_RECEIVED' ||
            action == 'PKS_WEIGHED') {
          if (panenId != null) {
            _navigateToHistory(panenId);
          } else {
            _navigateToMandorDashboard();
          }
        } else if (action == 'REJECTED' || action == 'CORRECTION_REQUIRED') {
          if (panenId != null) {
            _navigateToHarvestDetail(panenId);
          } else {
            _navigateToMandorDashboard();
          }
        } else if (action == 'ESCALATED' || action == 'SLA_BREACH') {
          _navigateToManagerDashboard(panenId);
        } else if (panenId != null) {
          _navigateToHarvestDetail(panenId);
        } else {
          _navigateToMandorDashboard();
        }
        break;
      case _typeHarvestEscalation:
      case _typeHarvestSlaBreach:
        _navigateToManagerDashboard(panenId);
        break;
      case _typeHarvestPksUpdate:
        if (panenId != null) {
          _navigateToHistory(panenId);
        } else {
          _navigateToMandorDashboard();
        }
        break;
      default:
        if (action == 'APPROVAL_NEEDED') {
          if (panenId != null) {
            _navigateToApproval(panenId);
          } else {
            _navigateToAsistenDashboard();
          }
        } else if (action == 'APPROVED' || action == 'PKS_RECEIVED') {
          if (panenId != null) {
            _navigateToHistory(panenId);
          } else {
            _navigateToMandorDashboard();
          }
        } else if (action == 'REJECTED' || action == 'CORRECTION_REQUIRED') {
          if (panenId != null) {
            _navigateToHarvestDetail(panenId);
          } else {
            _navigateToMandorDashboard();
          }
        } else if (action == 'ESCALATED' || action == 'SLA_BREACH') {
          _navigateToManagerDashboard(panenId);
        }
    }
  }

  /// Trigger harvest notification callback
  void _triggerHarvestCallback(Map<String, dynamic> data) {
    final panenId = _extractPanenId(data);
    final rawAction = data['action'] as String? ?? data['type'] as String?;
    final type = (data['type'] as String? ?? '').toUpperCase();
    final action = rawAction?.toUpperCase();

    if (panenId == null || action == null) {
      return;
    }

    if (!_harvestNotificationController.isClosed) {
      _harvestNotificationController.add(
        HarvestNotificationEvent(panenId: panenId, action: action, type: type),
      );
    }

    if (_onHarvestNotification != null) {
      _onHarvestNotification!(panenId, action);
    }
  }

  /// Store notification locally for display in notification page
  void _storeNotification({
    required String title,
    required String body,
    required Map<String, dynamic> data,
  }) {
    if (_notificationStorage == null) {
      _logger.w('NotificationStorageService not initialized, skipping storage');
      return;
    }

    // Map FCM data type to notification type
    String type = 'system';
    final fcmType = (data['type'] as String? ?? '').toUpperCase();
    final action = (data['action'] as String? ?? '').toUpperCase();

    if (fcmType.startsWith('MANAGER_')) {
      type = fcmType;
    } else if (fcmType == _typeHarvestApprovalNeeded ||
        action == 'APPROVAL_NEEDED') {
      type = 'harvest_new';
    } else if (fcmType == _typeHarvestStatusUpdate) {
      if (action == 'APPROVED') {
        type = 'harvest_approved';
      } else if (action == 'REJECTED') {
        type = 'harvest_rejected';
      } else if (action == 'PKS_RECEIVED' || action == 'PKS_WEIGHED') {
        type = 'harvest_pks_update';
      } else if (action == 'ESCALATED' || action == 'SLA_BREACH') {
        type = 'harvest_escalated';
      }
    } else if (fcmType == _typeHarvestEscalation ||
        fcmType == _typeHarvestSlaBreach) {
      type = 'harvest_escalated';
    } else if (fcmType == _typeHarvestPksUpdate) {
      type = 'harvest_pks_update';
    }

    // Store with metadata
    _notificationStorage!.addNotification(
      title: title,
      message: body,
      type: type,
      metadata: {
        'panen_id': _extractPanenId(data),
        'mandor_name': data['mandor_name'],
        'block_name': data['block_name'],
        'action': action,
        'type': fcmType,
        'click_action': data['click_action'],
        'division_id': data['division_id'],
        'estate_id': data['estate_id'],
      },
    );

    _logger.d('Notification stored: $title (type: $type)');
  }

  bool _shouldProcessIncomingNotification(
    Map<String, dynamic> data,
    String? title,
    String? body,
  ) {
    final now = DateTime.now();

    // Clean stale cache entries.
    _recentNotificationKeys.removeWhere(
      (_, ts) => now.difference(ts) > const Duration(minutes: 5),
    );

    final panenId = _extractPanenId(data)?.trim().toLowerCase() ?? '';
    final action = (data['action'] as String? ?? '').trim().toUpperCase();
    final type = (data['type'] as String? ?? '').trim().toUpperCase();
    final safeTitle = (title ?? '').trim();
    final safeBody = (body ?? '').trim();

    final dedupeKey = [type, action, panenId, safeTitle, safeBody].join('|');

    final previous = _recentNotificationKeys[dedupeKey];
    if (previous != null &&
        now.difference(previous) <= const Duration(seconds: 30)) {
      return false;
    }

    _recentNotificationKeys[dedupeKey] = now;
    return true;
  }

  // Navigation methods
  void _navigateToApproval(String panenId) {
    _logger.d('Navigate to approval: $panenId');
    AppRoutes.navigatorKey.currentState?.pushNamed(
      AppRoutes.asisten,
      arguments: {
        'tab': 1,
        'panenId': panenId,
        'action': 'APPROVAL_NEEDED',
        'type': _typeHarvestApprovalNeeded,
      },
    );
  }

  void _navigateToHistory(String panenId) {
    _logger.d('Navigate to history: $panenId');
    AppRoutes.navigatorKey.currentState?.pushNamed(
      AppRoutes.mandor,
      arguments: {
        'tab': 2,
        'panenId': panenId,
        'action': 'OPEN_HISTORY',
        'type': _typeHarvestStatusUpdate,
      },
    );
  }

  void _navigateToHarvestDetail(String panenId) {
    _logger.d('Navigate to harvest detail: $panenId');
    AppRoutes.navigatorKey.currentState?.pushNamed(
      AppRoutes.mandor,
      arguments: {
        'tab': 2,
        'panenId': panenId,
        'action': 'OPEN_DETAIL',
        'type': _typeHarvestStatusUpdate,
      },
    );
  }

  void _navigateToAsistenDashboard() {
    _logger.d('Navigate to Asisten dashboard');
    AppRoutes.navigatorKey.currentState?.pushNamed(AppRoutes.asisten);
  }

  void _navigateToMandorDashboard() {
    _logger.d('Navigate to Mandor dashboard');
    AppRoutes.navigatorKey.currentState?.pushNamed(AppRoutes.mandor);
  }

  void _navigateToManagerDashboard(String? panenId) {
    _logger.d('Navigate to Manager dashboard: $panenId');
    AppRoutes.navigatorKey.currentState?.pushNamed(
      AppRoutes.manager,
      arguments: {
        'panenId': panenId,
        'action': 'SLA_BREACH',
        'type': _typeHarvestEscalation,
      },
    );
  }

  void _navigateToPath(
    String path, {
    String? panenId,
    String? action,
    String? type,
  }) {
    final resolvedPath = _normalizeRoutePath(path);
    _logger.d(
      'Navigate to path: $path (resolved: $resolvedPath) with panen: $panenId',
    );

    if (resolvedPath.startsWith('/')) {
      final args = <String, dynamic>{
        'panenId': panenId,
        'action': action,
        'type': type,
      }..removeWhere((_, value) => value == null);

      if (resolvedPath == AppRoutes.asisten) {
        args['tab'] = 1;
      } else if (resolvedPath == AppRoutes.mandor) {
        args['tab'] = 2;
      }

      AppRoutes.navigatorKey.currentState?.pushNamed(
        resolvedPath,
        arguments: args.isEmpty ? null : args,
      );
    }
  }

  String _normalizeRoutePath(String path) {
    return normalizeNotificationRoutePath(path);
  }

  String? _extractPanenId(Map<String, dynamic> data) {
    final keys = ['panen_id', 'harvest_id', 'transaction_id', 'record_id'];
    for (final key in keys) {
      final value = data[key];
      if (value is String && value.trim().isNotEmpty) {
        return value;
      }
    }
    return null;
  }

  String? _buildNotificationPayload(Map<String, dynamic> data) {
    try {
      return jsonEncode({
        'type': data['type'],
        'action': data['action'],
        'panen_id': _extractPanenId(data),
        'click_action': data['click_action'],
      });
    } catch (_) {
      return _extractPanenId(data);
    }
  }

  Map<String, dynamic> _parseNotificationPayload(String payload) {
    try {
      final decoded = jsonDecode(payload);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      if (decoded is Map) {
        return decoded.map((key, value) => MapEntry(key.toString(), value));
      }
    } catch (_) {
      // Handle backward compatibility with legacy payload = panen_id only.
    }
    return {'panen_id': payload};
  }

  /// Get and register FCM token
  Future<void> _registerToken() async {
    try {
      final token = await _fcm.getToken();
      if (token != null) {
        await _sendTokenToServer(token);
      }
    } catch (e) {
      _logger.e('Failed to get FCM token: $e');
    }
  }

  /// Handle token refresh
  Future<void> _onTokenRefresh(String token) async {
    _logger.i('FCM token refreshed');
    // Only send token if user is authenticated
    if (_isAuthenticated) {
      await _sendTokenToServer(token);
    } else {
      _logger.d('Skipping token refresh - user not authenticated');
    }
  }

  /// Send token to backend
  Future<void> _sendTokenToServer(String token) async {
    // Retry getting client if failed earlier
    if (_graphqlClient == null) {
      try {
        final service = ServiceLocator.get<GraphQLClientService>();
        _graphqlClient = service.client;
      } catch (e) {
        _logger.w(
          'GraphQL client still not available for FCM token registration',
        );
        return;
      }
    }

    try {
      final deviceId = await _getDeviceId();
      final platform = Platform.isAndroid ? 'ANDROID' : 'IOS';

      const mutation = '''
        mutation RegisterFCMToken(\$input: RegisterFCMTokenInput!) {
          registerFCMToken(input: \$input)
        }
      ''';

      final result = await _graphqlClient!.mutate(
        MutationOptions(
          document: gql(mutation),
          variables: {
            'input': {
              'token': token,
              'platform': platform,
              'deviceId': deviceId,
            },
          },
        ),
      );

      if (result.hasException) {
        _logger.e('Failed to register FCM token: ${result.exception}');
      } else {
        _logger.i('FCM token registered successfully');
      }
    } catch (e) {
      _logger.e('Error registering FCM token: $e');
    }
  }

  /// Unregister token (call on logout)
  Future<void> unregisterToken() async {
    // Clear auth state
    clearAuthState();

    try {
      final token = await _fcm.getToken();
      if (token != null) {
        if (_graphqlClient == null) {
          try {
            final service = ServiceLocator.get<GraphQLClientService>();
            _graphqlClient = service.client;
          } catch (e) {
            /* ignore */
          }
        }

        if (_graphqlClient != null) {
          const mutation = '''
              mutation UnregisterFCMToken(\$token: String!) {
                unregisterFCMToken(token: \$token)
              }
            ''';

          await _graphqlClient!.mutate(
            MutationOptions(
              document: gql(mutation),
              variables: {'token': token},
            ),
          );
          _logger.i('FCM token unregistered');
        }
      }
    } catch (e) {
      _logger.e('Error unregistering FCM token: $e');
    }
  }

  /// Get device ID
  Future<String> _getDeviceId() async {
    final deviceInfo = DeviceInfoPlugin();

    if (Platform.isAndroid) {
      final androidInfo = await deviceInfo.androidInfo;
      return androidInfo.id;
    } else if (Platform.isIOS) {
      final iosInfo = await deviceInfo.iosInfo;
      return iosInfo.identifierForVendor ?? 'unknown';
    }

    return 'unknown';
  }

  /// Get current FCM token
  Future<String?> getToken() async {
    return await _fcm.getToken();
  }
}

String normalizeNotificationRoutePath(String path) {
  final raw = path.trim();
  final normalized = raw.toLowerCase();

  switch (normalized) {
    case '/approval':
    case '/approvals':
    case '/asisten/approval':
    case '/dashboard/asisten/approval':
      return AppRoutes.asisten;
    case '/history':
    case '/panen':
    case '/mandor/history':
    case '/dashboard/mandor/history':
    case '/dashboard/mandor/panen':
      return AppRoutes.mandor;
    case '/manager/notifications':
    case '/manager/monitor':
    case '/manager/analytics':
      return AppRoutes.manager;
    default:
      return raw;
  }
}
