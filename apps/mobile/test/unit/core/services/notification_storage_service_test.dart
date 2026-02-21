import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:agrinova_mobile/core/services/notification_storage_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('NotificationStorageService', () {
    test('isolates notifications by user scope', () async {
      final service = NotificationStorageService();
      await service.initialize();

      await service.setActiveUser('user-a');
      await service.addNotification(
        title: 'A1',
        message: 'Notif A',
        type: 'harvest_new',
      );
      expect(await service.getUnreadCount(), 1);

      await service.setActiveUser('user-b');
      expect(await service.getUnreadCount(), 0);
      await service.addNotification(
        title: 'B1',
        message: 'Notif B',
        type: 'harvest_new',
      );
      expect(await service.getUnreadCount(), 1);

      await service.setActiveUser('user-a');
      expect(await service.getUnreadCount(), 1);
      final userANotifications = await service.getNotifications();
      expect(userANotifications.first.title, 'A1');
    });

    test('emits unread badge updates on add/read/clear operations', () async {
      final service = NotificationStorageService();
      await service.initialize();
      await service.setActiveUser('user-stream');

      final emittedCounts = <int>[];
      final subscription = NotificationStorageService.unreadCountStream
          .listen(emittedCounts.add);

      await service.addNotification(
        title: 'N1',
        message: 'Message 1',
        type: 'harvest_new',
      );
      await service.addNotification(
        title: 'N2',
        message: 'Message 2',
        type: 'harvest_new',
      );

      final notifications = await service.getNotifications();
      await service.markAsRead(notifications.first.id);
      await service.clearAll();

      // Give stream microtasks time to flush.
      await Future<void>.delayed(const Duration(milliseconds: 20));

      await subscription.cancel();

      expect(emittedCounts.where((count) => count == 2).isNotEmpty, true);
      expect(emittedCounts.where((count) => count == 1).isNotEmpty, true);
      expect(emittedCounts.last, 0);
    });

    test('migrates legacy notifications to first scoped user', () async {
      SharedPreferences.setMockInitialValues({
        'app_notifications':
            '[{"id":"1","title":"Legacy","message":"Legacy message","type":"system","createdAt":"2026-02-16T00:00:00.000Z","isRead":false}]',
      });

      final service = NotificationStorageService();
      await service.initialize();
      await service.setActiveUser('user-migrated');

      final scopedNotifications = await service.getNotifications();
      expect(scopedNotifications.length, 1);
      expect(scopedNotifications.first.title, 'Legacy');
      expect(await service.getUnreadCount(), 1);
    });
  });
}
