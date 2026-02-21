import 'dart:convert';
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:logger/logger.dart';

/// Model class for storing notification data
class AppNotification {
  final String id;
  final String title;
  final String message;
  final String
      type; // 'harvest_new', 'harvest_approved', 'harvest_rejected', 'system'
  final DateTime createdAt;
  bool isRead;
  final Map<String, dynamic>? metadata; // panenId, mandorName, blockName, etc.

  AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.createdAt,
    this.isRead = false,
    this.metadata,
  });

  /// Create from JSON
  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      title: json['title'] as String,
      message: json['message'] as String,
      type: json['type'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      isRead: json['isRead'] as bool? ?? false,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'message': message,
      'type': type,
      'createdAt': createdAt.toIso8601String(),
      'isRead': isRead,
      'metadata': metadata,
    };
  }

  /// Get formatted relative time string
  String get relativeTime {
    final now = DateTime.now();
    final diff = now.difference(createdAt);

    if (diff.inMinutes < 1) {
      return 'Baru saja';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes} menit lalu';
    } else if (diff.inHours < 24) {
      return '${diff.inHours} jam lalu';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} hari lalu';
    } else {
      return '${createdAt.day}/${createdAt.month}/${createdAt.year}';
    }
  }

  /// Create a copy with updated read status
  AppNotification copyWith({bool? isRead}) {
    return AppNotification(
      id: id,
      title: title,
      message: message,
      type: type,
      createdAt: createdAt,
      isRead: isRead ?? this.isRead,
      metadata: metadata,
    );
  }
}

/// Service for storing and retrieving FCM notifications locally
class NotificationStorageService {
  static const String _storageKeyPrefix = 'app_notifications';
  static const String _legacyStorageKey = _storageKeyPrefix;
  static const int _maxNotifications = 100; // Limit stored notifications
  static final StreamController<int> _unreadCountController =
      StreamController<int>.broadcast();

  static Stream<int> get unreadCountStream => _unreadCountController.stream;

  final Logger _logger = Logger();
  SharedPreferences? _prefs;
  String? _activeUserId;

  /// Initialize the service
  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
    _logger.d('NotificationStorageService initialized');
    await _emitUnreadCount();
  }

  /// Set active user scope for notifications.
  /// Notifications are isolated per user: `app_notifications_<userId>`.
  Future<void> setActiveUser(String? userId) async {
    _activeUserId = _normalizeUserId(userId);
    final prefs = await _getPrefs();
    await _migrateLegacyNotificationsIfNeeded(prefs);
    await _emitUnreadCount();
  }

  /// Add a new notification
  Future<void> addNotification({
    required String title,
    required String message,
    required String type,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final prefs = await _getPrefs();
      final notifications = await getNotifications();
      final now = DateTime.now();

      // Deduplicate by event identity (type + panen_id + action) in recent window.
      // Fallback to same title/message/type to guard against duplicate listeners.
      final incomingPanenId =
          metadata?['panen_id']?.toString().trim().toLowerCase() ?? '';
      final incomingAction =
          metadata?['action']?.toString().trim().toUpperCase() ?? '';
      final duplicateExists = notifications.any((existing) {
        if (existing.type != type) return false;

        final age = now.difference(existing.createdAt).abs();
        if (age > const Duration(minutes: 10)) return false;

        final existingPanenId =
            existing.metadata?['panen_id']?.toString().trim().toLowerCase() ??
                '';
        final existingAction =
            existing.metadata?['action']?.toString().trim().toUpperCase() ?? '';

        final sameEventIdentity = incomingPanenId.isNotEmpty &&
            existingPanenId.isNotEmpty &&
            incomingPanenId == existingPanenId &&
            incomingAction == existingAction;

        if (sameEventIdentity) {
          return true;
        }

        return existing.title == title && existing.message == message;
      });

      if (duplicateExists) {
        _logger.d('Skipping duplicate notification: $title ($type)');
        return;
      }

      final newNotification = AppNotification(
        id: now.millisecondsSinceEpoch.toString(),
        title: title,
        message: message,
        type: type,
        createdAt: now,
        isRead: false,
        metadata: metadata,
      );

      // Add to beginning of list (newest first)
      notifications.insert(0, newNotification);

      // Trim if exceeding max
      if (notifications.length > _maxNotifications) {
        notifications.removeRange(_maxNotifications, notifications.length);
      }

      await _saveNotifications(prefs, notifications);
      _logger.d('Notification added: ${newNotification.title}');
      await _emitUnreadCount();
    } catch (e) {
      _logger.e('Error adding notification: $e');
    }
  }

  /// Whether an active user scope is set
  bool get hasActiveUser => _activeUserId != null;

  /// Get all notifications
  Future<List<AppNotification>> getNotifications() async {
    try {
      if (_activeUserId == null) {
        _logger.w(
            'getNotifications called without active user scope - using legacy key');
      }
      final prefs = await _getPrefs();
      final jsonString = prefs.getString(_storageKey);

      if (jsonString == null || jsonString.isEmpty) {
        return [];
      }

      final List<dynamic> jsonList = jsonDecode(jsonString);
      final notifications = jsonList
          .map((json) => AppNotification.fromJson(json as Map<String, dynamic>))
          .toList();

      // Clean up accidental duplicates from older builds/listeners.
      final deduplicated = _deduplicateNotifications(notifications);
      if (deduplicated.length != notifications.length) {
        await _saveNotifications(prefs, deduplicated);
        _logger.d(
            'Removed ${notifications.length - deduplicated.length} duplicate notifications');
      }
      return deduplicated;
    } catch (e) {
      _logger.e('Error getting notifications: $e');
      return [];
    }
  }

  /// Get unread notification count
  Future<int> getUnreadCount() async {
    final notifications = await getNotifications();
    return notifications.where((n) => !n.isRead).length;
  }

  /// Mark a notification as read
  Future<void> markAsRead(String notificationId) async {
    try {
      final prefs = await _getPrefs();
      final notifications = await getNotifications();

      final index = notifications.indexWhere((n) => n.id == notificationId);
      if (index != -1) {
        notifications[index] = notifications[index].copyWith(isRead: true);
        await _saveNotifications(prefs, notifications);
        _logger.d('Notification marked as read: $notificationId');
        await _emitUnreadCount();
      }
    } catch (e) {
      _logger.e('Error marking notification as read: $e');
    }
  }

  /// Mark unread harvest approval notifications for a specific harvest as read.
  /// Returns number of notifications updated.
  Future<int> markHarvestApprovalNotificationsAsRead(String panenId) async {
    final normalizedPanenId = panenId.trim().toLowerCase();
    if (normalizedPanenId.isEmpty) {
      return 0;
    }

    try {
      final prefs = await _getPrefs();
      final notifications = await getNotifications();
      var changedCount = 0;

      final updated = notifications.map((notification) {
        if (notification.isRead) {
          return notification;
        }

        final notifPanenId = notification.metadata?['panen_id']
                ?.toString()
                .trim()
                .toLowerCase() ??
            '';
        if (notifPanenId != normalizedPanenId) {
          return notification;
        }

        if (notification.type != 'harvest_new') {
          return notification;
        }

        changedCount++;
        return notification.copyWith(isRead: true);
      }).toList();

      if (changedCount > 0) {
        await _saveNotifications(prefs, updated);
        await _emitUnreadCount();
        _logger.d(
            'Marked $changedCount harvest approval notifications as read for panen_id: $panenId');
      }

      return changedCount;
    } catch (e) {
      _logger.e('Error marking harvest approval notifications as read: $e');
      return 0;
    }
  }

  /// Mark stale approval notifications as read if their harvest is no longer pending.
  /// Returns number of notifications updated.
  Future<int> reconcilePendingHarvestApprovalNotifications(
    Set<String> pendingHarvestIds,
  ) async {
    final normalizedPendingIds = pendingHarvestIds
        .map((id) => id.trim().toLowerCase())
        .where((id) => id.isNotEmpty)
        .toSet();

    try {
      final prefs = await _getPrefs();
      final notifications = await getNotifications();
      var changedCount = 0;

      final updated = notifications.map((notification) {
        if (notification.isRead || notification.type != 'harvest_new') {
          return notification;
        }

        final notifPanenId = notification.metadata?['panen_id']
                ?.toString()
                .trim()
                .toLowerCase() ??
            '';
        if (notifPanenId.isEmpty) {
          return notification;
        }

        if (normalizedPendingIds.contains(notifPanenId)) {
          return notification;
        }

        changedCount++;
        return notification.copyWith(isRead: true);
      }).toList();

      if (changedCount > 0) {
        await _saveNotifications(prefs, updated);
        await _emitUnreadCount();
        _logger.d(
            'Reconciled $changedCount stale harvest approval notifications as read');
      }

      return changedCount;
    } catch (e) {
      _logger.e('Error reconciling pending harvest approval notifications: $e');
      return 0;
    }
  }

  /// Mark all notifications as read
  Future<void> markAllAsRead() async {
    try {
      final prefs = await _getPrefs();
      final notifications = await getNotifications();

      final updatedNotifications =
          notifications.map((n) => n.copyWith(isRead: true)).toList();

      await _saveNotifications(prefs, updatedNotifications);
      _logger.d('All notifications marked as read');
      await _emitUnreadCount();
    } catch (e) {
      _logger.e('Error marking all notifications as read: $e');
    }
  }

  /// Delete a single notification
  Future<void> deleteNotification(String notificationId) async {
    try {
      final prefs = await _getPrefs();
      final notifications = await getNotifications();

      notifications.removeWhere((n) => n.id == notificationId);
      await _saveNotifications(prefs, notifications);
      _logger.d('Notification deleted: $notificationId');
      await _emitUnreadCount();
    } catch (e) {
      _logger.e('Error deleting notification: $e');
    }
  }

  /// Clear all notifications
  Future<void> clearAll() async {
    try {
      final prefs = await _getPrefs();
      await prefs.remove(_storageKey);
      _logger.d('All notifications cleared');
      await _emitUnreadCount();
    } catch (e) {
      _logger.e('Error clearing all notifications: $e');
    }
  }

  /// Clear notification scope on logout to prevent cross-user contamination
  Future<void> clearOnLogout() async {
    try {
      final prefs = await _getPrefs();
      // Remove legacy key to prevent leaking to next user
      await prefs.remove(_legacyStorageKey);
      _activeUserId = null;
      await _emitUnreadCount();
      _logger.d('Notification scope cleared on logout');
    } catch (e) {
      _logger.e('Error clearing notification scope on logout: $e');
    }
  }

  Future<void> _emitUnreadCount() async {
    try {
      final count = await getUnreadCount();
      if (!_unreadCountController.isClosed) {
        _unreadCountController.add(count);
      }
    } catch (e) {
      _logger.w('Failed to emit unread count: $e');
    }
  }

  /// Save notifications to SharedPreferences
  Future<void> _saveNotifications(
    SharedPreferences prefs,
    List<AppNotification> notifications,
  ) async {
    final jsonList = notifications.map((n) => n.toJson()).toList();
    await prefs.setString(_storageKey, jsonEncode(jsonList));
  }

  /// Get SharedPreferences instance
  Future<SharedPreferences> _getPrefs() async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  String get _storageKey {
    if (_activeUserId == null) {
      return _legacyStorageKey;
    }
    return '$_storageKeyPrefix$_storageKeyUserSeparator$_activeUserId';
  }

  static const String _storageKeyUserSeparator = '_';

  String? _normalizeUserId(String? userId) {
    final trimmed = userId?.trim();
    if (trimmed == null || trimmed.isEmpty) {
      return null;
    }
    return trimmed;
  }

  Future<void> _migrateLegacyNotificationsIfNeeded(
    SharedPreferences prefs,
  ) async {
    if (_activeUserId == null) {
      return;
    }

    final scopedKey = _storageKey;
    if (prefs.containsKey(scopedKey)) {
      return;
    }

    final legacyJson = prefs.getString(_legacyStorageKey);
    if (legacyJson == null || legacyJson.isEmpty) {
      return;
    }

    await prefs.setString(scopedKey, legacyJson);
    // Remove legacy key to prevent cross-user contamination on shared devices
    await prefs.remove(_legacyStorageKey);
    _logger.d('Migrated legacy notifications to scoped key: $scopedKey');
  }

  List<AppNotification> _deduplicateNotifications(
    List<AppNotification> notifications,
  ) {
    final seenKeys = <String>{};
    final deduplicated = <AppNotification>[];

    for (final notification in notifications) {
      final key = _buildNotificationIdentityKey(notification);
      if (seenKeys.contains(key)) {
        continue;
      }
      seenKeys.add(key);
      deduplicated.add(notification);
    }

    return deduplicated;
  }

  String _buildNotificationIdentityKey(AppNotification notification) {
    final panenId =
        notification.metadata?['panen_id']?.toString().trim().toLowerCase() ??
            '';
    final action =
        notification.metadata?['action']?.toString().trim().toUpperCase() ?? '';

    if (panenId.isNotEmpty) {
      return [
        notification.type,
        panenId,
        action,
        notification.title.trim(),
        notification.message.trim(),
      ].join('|');
    }

    return [
      notification.type,
      notification.title.trim(),
      notification.message.trim(),
      // Fallback bucket for system messages with no panen_id
      (notification.createdAt.millisecondsSinceEpoch ~/ 10000).toString(),
    ].join('|');
  }
}
