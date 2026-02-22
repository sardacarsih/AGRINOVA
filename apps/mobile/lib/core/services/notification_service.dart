import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:logger/logger.dart';


// Notification types for different features
enum NotificationType {
  harvestPending,
  harvestApproved,
  harvestRejected,
  gateCheckAlert,
  syncComplete,
  syncError,
  appUpdateAvailable,
  appUpdateReady,
  appUpdateCritical,
  general,
}

class NotificationService {
  static final Logger _logger = Logger();
  final FirebaseMessaging _firebaseMessaging;
  final FlutterLocalNotificationsPlugin _localNotifications;
  
  String? _fcmToken;
  bool _isInitialized = false;

  NotificationService({
    required FirebaseMessaging firebaseMessaging,
    required FlutterLocalNotificationsPlugin localNotifications,
  }) : _firebaseMessaging = firebaseMessaging,
       _localNotifications = localNotifications;

  // Getters
  String? get fcmToken => _fcmToken;
  bool get isInitialized => _isInitialized;

  // Initialize notification service
  Future<bool> initialize() async {
    try {
      _logger.d('Initializing notification service');

      // Initialize local notifications
      await _initializeLocalNotifications();
      
      // Initialize Firebase messaging
      await _initializeFirebaseMessaging();
      
      // Set up message handlers
      _setupMessageHandlers();
      
      _isInitialized = true;
      _logger.d('Notification service initialized successfully');
      return true;
    } catch (e) {
      _logger.e('Error initializing notification service: $e');
      return false;
    }
  }

  // Initialize local notifications
  Future<void> _initializeLocalNotifications() async {
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings(
          requestSoundPermission: true,
          requestBadgePermission: true,
          requestAlertPermission: true,
        );
    
    const InitializationSettings initializationSettings =
        InitializationSettings(
          android: initializationSettingsAndroid,
          iOS: initializationSettingsIOS,
        );

    await _localNotifications.initialize(
      settings: initializationSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    _logger.d('Local notifications initialized');
  }

  // Initialize Firebase messaging
  Future<void> _initializeFirebaseMessaging() async {
    // Request permission for notifications
    final settings = await _firebaseMessaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    _logger.d('Notification permission status: ${settings.authorizationStatus}');

    // Get FCM token
    _fcmToken = await _firebaseMessaging.getToken();
    _logger.d('FCM Token: $_fcmToken');

    // Listen for token refresh
    _firebaseMessaging.onTokenRefresh.listen((token) {
      _fcmToken = token;
      _logger.d('FCM Token refreshed: $token');
      // TODO: Send updated token to server
    });
  }

  // Set up message handlers
  void _setupMessageHandlers() {
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      _logger.d('Foreground message received: ${message.messageId}');
      _handleForegroundMessage(message);
    });

    // Handle background message taps
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      _logger.d('Background message opened: ${message.messageId}');
      _handleMessageTap(message);
    });

    // Handle app launch from terminated state
    _firebaseMessaging.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        _logger.d('App opened from terminated state: ${message.messageId}');
        _handleMessageTap(message);
      }
    });
  }

  // Handle foreground messages
  void _handleForegroundMessage(RemoteMessage message) {
    final notification = message.notification;
    final data = message.data;

    if (notification != null) {
      showLocalNotification(
        title: notification.title ?? 'Agrinova',
        body: notification.body ?? '',
        data: data,
        type: _getNotificationTypeFromData(data),
      );
    }
  }

  // Handle message tap
  void _handleMessageTap(RemoteMessage message) {
    final data = message.data;
    final type = _getNotificationTypeFromData(data);
    
    // Navigate based on notification type
    // TODO: Implement navigation logic
    _logger.d('Handling message tap for type: $type, data: $data');
  }

  // Handle local notification tap
  void _onNotificationTapped(NotificationResponse response) {
    final payload = response.payload;
    if (payload != null) {
      try {
        final data = jsonDecode(payload);
        final type = _getNotificationTypeFromData(data);
        _logger.d('Local notification tapped: $type, data: $data');
        // TODO: Implement navigation logic
      } catch (e) {
        _logger.e('Error parsing notification payload: $e');
      }
    }
  }

  // Get notification type from data
  NotificationType _getNotificationTypeFromData(Map<String, dynamic> data) {
    final typeString = data['type'] as String?;
    
    switch (typeString) {
      case 'harvest_pending':
        return NotificationType.harvestPending;
      case 'harvest_approved':
        return NotificationType.harvestApproved;
      case 'harvest_rejected':
        return NotificationType.harvestRejected;
      case 'gate_check_alert':
        return NotificationType.gateCheckAlert;
      case 'sync_complete':
        return NotificationType.syncComplete;
      case 'sync_error':
        return NotificationType.syncError;
      case 'app_update_available':
        return NotificationType.appUpdateAvailable;
      case 'app_update_ready':
        return NotificationType.appUpdateReady;
      case 'app_update_critical':
        return NotificationType.appUpdateCritical;
      default:
        return NotificationType.general;
    }
  }

  // Show local notification
  Future<void> showLocalNotification({
    required String title,
    required String body,
    Map<String, dynamic>? data,
    NotificationType type = NotificationType.general,
    int? id,
  }) async {
    try {
      final notificationId = id ?? DateTime.now().millisecondsSinceEpoch ~/ 1000;
      final channelInfo = _getChannelInfo(type);
      
      final AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
        channelInfo['id'] ?? 'general',
        channelInfo['name'] ?? 'General',
        channelDescription: channelInfo['description'],
        importance: Importance.high,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
        color: const Color(0xFF2E7D32),
        enableVibration: true,
        playSound: true,
      );

      const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      final NotificationDetails notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      final payload = data != null ? jsonEncode(data) : null;

      await _localNotifications.show(
        id: notificationId,
        title: title,
        body: body,
        notificationDetails: notificationDetails,
        payload: payload,
      );

      _logger.d('Local notification shown: $title');
    } catch (e) {
      _logger.e('Error showing local notification: $e');
    }
  }

  // Get channel info for notification type
  Map<String, String> _getChannelInfo(NotificationType type) {
    switch (type) {
      case NotificationType.harvestPending:
        return {
          'id': 'harvest_pending',
          'name': 'Harvest Pending Approval',
          'description': 'Notifications for harvest records pending approval',
        };
      case NotificationType.harvestApproved:
        return {
          'id': 'harvest_approved',
          'name': 'Harvest Approved',
          'description': 'Notifications for approved harvest records',
        };
      case NotificationType.harvestRejected:
        return {
          'id': 'harvest_rejected',
          'name': 'Harvest Rejected',
          'description': 'Notifications for rejected harvest records',
        };
      case NotificationType.gateCheckAlert:
        return {
          'id': 'gate_check_alert',
          'name': 'Gate Check Alerts',
          'description': 'Notifications for gate check alerts and discrepancies',
        };
      case NotificationType.syncComplete:
        return {
          'id': 'sync_complete',
          'name': 'Sync Complete',
          'description': 'Notifications for successful data synchronization',
        };
      case NotificationType.syncError:
        return {
          'id': 'sync_error',
          'name': 'Sync Error',
          'description': 'Notifications for data synchronization errors',
        };
      case NotificationType.appUpdateAvailable:
        return {
          'id': 'app_update_available',
          'name': 'App Update Available',
          'description': 'Notifications when app updates are available',
        };
      case NotificationType.appUpdateReady:
        return {
          'id': 'app_update_ready',
          'name': 'App Update Ready',
          'description': 'Notifications when app updates are ready to install',
        };
      case NotificationType.appUpdateCritical:
        return {
          'id': 'app_update_critical',
          'name': 'Critical App Update',
          'description': 'Notifications for critical app updates',
        };
      default:
        return {
          'id': 'general',
          'name': 'General',
          'description': 'General notifications',
        };
    }
  }

  // Schedule notification
  Future<void> scheduleNotification({
    required String title,
    required String body,
    required DateTime scheduledTime,
    Map<String, dynamic>? data,
    NotificationType type = NotificationType.general,
    int? id,
  }) async {
    try {
      final notificationId = id ?? DateTime.now().millisecondsSinceEpoch ~/ 1000;
      final channelInfo = _getChannelInfo(type);
      
      final AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
        channelInfo['id'] ?? 'general',
        channelInfo['name'] ?? 'General',
        channelDescription: channelInfo['description'],
        importance: Importance.high,
        priority: Priority.high,
      );

      const DarwinNotificationDetails iosDetails = DarwinNotificationDetails();

      final NotificationDetails notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      final payload = data != null ? jsonEncode(data) : null;

      await _localNotifications.zonedSchedule(
        id: notificationId,
        title: title,
        body: body,
        scheduledDate: tz.TZDateTime.from(scheduledTime, tz.local),
        notificationDetails: notificationDetails,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        payload: payload,
      );

      _logger.d('Notification scheduled: $title for ${scheduledTime.toIso8601String()}');
    } catch (e) {
      _logger.e('Error scheduling notification: $e');
    }
  }

  // Cancel notification
  Future<void> cancelNotification(int id) async {
    try {
      await _localNotifications.cancel(id: id);
      
      _logger.d('Notification cancelled: $id');
    } catch (e) {
      _logger.e('Error cancelling notification: $e');
    }
  }

  // Cancel all notifications
  Future<void> cancelAllNotifications() async {
    try {
      await _localNotifications.cancelAll();
      _logger.d('All notifications cancelled');
    } catch (e) {
      _logger.e('Error cancelling all notifications: $e');
    }
  }

  // Get pending notifications
  Future<List<PendingNotificationRequest>> getPendingNotifications() async {
    try {
      return await _localNotifications.pendingNotificationRequests();
    } catch (e) {
      _logger.e('Error getting pending notifications: $e');
      return [];
    }
  }

  // Subscribe to topic
  Future<void> subscribeToTopic(String topic) async {
    try {
      await _firebaseMessaging.subscribeToTopic(topic);
      _logger.d('Subscribed to topic: $topic');
    } catch (e) {
      _logger.e('Error subscribing to topic: $e');
    }
  }

  // Unsubscribe from topic
  Future<void> unsubscribeFromTopic(String topic) async {
    try {
      await _firebaseMessaging.unsubscribeFromTopic(topic);
      _logger.d('Unsubscribed from topic: $topic');
    } catch (e) {
      _logger.e('Error unsubscribing from topic: $e');
    }
  }

  // Subscribe to role-based topics
  Future<void> subscribeToRoleTopics(String userRole, String companyId) async {
    try {
      // Subscribe to company-wide topics
      await subscribeToTopic('company_$companyId');
      
      // Subscribe to role-specific topics
      await subscribeToTopic('role_$userRole');
      
      // Subscribe to combined topics
      await subscribeToTopic('${companyId}_$userRole');
      
      _logger.d('Subscribed to role topics for $userRole in company $companyId');
    } catch (e) {
      _logger.e('Error subscribing to role topics: $e');
    }
  }

  // Unsubscribe from role-based topics
  Future<void> unsubscribeFromRoleTopics(String userRole, String companyId) async {
    try {
      await unsubscribeFromTopic('company_$companyId');
      await unsubscribeFromTopic('role_$userRole');
      await unsubscribeFromTopic('${companyId}_$userRole');
      
      _logger.d('Unsubscribed from role topics for $userRole in company $companyId');
    } catch (e) {
      _logger.e('Error unsubscribing from role topics: $e');
    }
  }

  // Show harvest approval notification
  Future<void> showHarvestApprovalNotification({
    required String harvestId,
    required String blockName,
    required String mandorName,
    required DateTime harvestDate,
  }) async {
    await showLocalNotification(
      title: 'Harvest Pending Approval',
      body: 'New harvest from $blockName by $mandorName requires approval',
      type: NotificationType.harvestPending,
      data: {
        'type': 'harvest_pending',
        'harvestId': harvestId,
        'blockName': blockName,
        'mandorName': mandorName,
        'harvestDate': harvestDate.toIso8601String(),
      },
    );
  }

  // Show gate check alert notification
  Future<void> showGateCheckAlertNotification({
    required String vehiclePlate,
    required String driverName,
    required String alertMessage,
  }) async {
    await showLocalNotification(
      title: 'Gate Check Alert',
      body: 'Alert for vehicle $vehiclePlate: $alertMessage',
      type: NotificationType.gateCheckAlert,
      data: {
        'type': 'gate_check_alert',
        'vehiclePlate': vehiclePlate,
        'driverName': driverName,
        'alertMessage': alertMessage,
      },
    );
  }

  // Show sync status notification
  Future<void> showSyncStatusNotification({
    required bool isSuccess,
    required int recordCount,
    String? errorMessage,
  }) async {
    if (isSuccess) {
      await showLocalNotification(
        title: 'Sync Complete',
        body: '$recordCount records synchronized successfully',
        type: NotificationType.syncComplete,
        data: {
          'type': 'sync_complete',
          'recordCount': recordCount,
        },
      );
    } else {
      await showLocalNotification(
        title: 'Sync Failed',
        body: errorMessage ?? 'Failed to synchronize data',
        type: NotificationType.syncError,
        data: {
          'type': 'sync_error',
          'errorMessage': errorMessage,
        },
      );
    }
  }

  // Show app update available notification
  Future<void> showUpdateAvailableNotification({
    required String title,
    required String body,
    String? version,
    bool isCritical = false,
    Map<String, dynamic>? additionalData,
  }) async {
    final type = isCritical 
        ? NotificationType.appUpdateCritical 
        : NotificationType.appUpdateAvailable;
    
    await showLocalNotification(
      title: title,
      body: body,
      type: type,
      data: {
        'type': isCritical ? 'app_update_critical' : 'app_update_available',
        'version': version,
        'isCritical': isCritical,
        ...?additionalData,
      },
    );
  }

  // Show app update ready notification
  Future<void> showUpdateReadyNotification({
    String? version,
    Map<String, dynamic>? additionalData,
  }) async {
    await showLocalNotification(
      title: 'Update Ready to Install',
      body: version != null 
          ? 'Agrinova $version has been downloaded and is ready to install'
          : 'App update has been downloaded and is ready to install',
      type: NotificationType.appUpdateReady,
      data: {
        'type': 'app_update_ready',
        'version': version,
        ...?additionalData,
      },
    );
  }

  // Show critical update notification with high priority
  Future<void> showCriticalUpdateNotification({
    required String version,
    String? securityMessage,
  }) async {
    await showLocalNotification(
      title: 'Critical Security Update Required',
      body: securityMessage ?? 
          'Agrinova $version contains important security fixes. Please update immediately.',
      type: NotificationType.appUpdateCritical,
      data: {
        'type': 'app_update_critical',
        'version': version,
        'securityMessage': securityMessage,
        'isCritical': true,
      },
    );
  }

  // Check notification permissions
  Future<bool> areNotificationsEnabled() async {
    try {
      if (Platform.isAndroid) {
        return await _localNotifications
                .resolvePlatformSpecificImplementation<
                    AndroidFlutterLocalNotificationsPlugin>()
                ?.areNotificationsEnabled() ??
            false;
      } else if (Platform.isIOS) {
        final settings = await _firebaseMessaging.getNotificationSettings();
        return settings.authorizationStatus == AuthorizationStatus.authorized;
      }
      return false;
    } catch (e) {
      _logger.e('Error checking notification permissions: $e');
      return false;
    }
  }

  // Get notification settings info
  Future<Map<String, dynamic>> getNotificationInfo() async {
    try {
      final settings = await _firebaseMessaging.getNotificationSettings();
      final pendingNotifications = await getPendingNotifications();
      
      return {
        'isInitialized': _isInitialized,
        'fcmToken': _fcmToken,
        'authorizationStatus': settings.authorizationStatus.toString(),
        'alert': settings.alert.toString(),
        'badge': settings.badge.toString(),
        'sound': settings.sound.toString(),
        'pendingCount': pendingNotifications.length,
        'enabled': await areNotificationsEnabled(),
      };
    } catch (e) {
      _logger.e('Error getting notification info: $e');
      return {
        'isInitialized': false,
        'error': e.toString(),
      };
    }
  }

  // Dispose notification service
  void dispose() {
    try {
      _logger.d('Notification service disposed');
    } catch (e) {
      _logger.e('Error disposing notification service: $e');
    }
  }
}
