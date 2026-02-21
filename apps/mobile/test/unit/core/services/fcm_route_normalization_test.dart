import 'package:flutter_test/flutter_test.dart';

import 'package:agrinova_mobile/core/routes/app_routes.dart';
import 'package:agrinova_mobile/core/services/fcm_service.dart';

void main() {
  group('normalizeNotificationRoutePath', () {
    test('maps legacy approval routes to asisten route', () {
      expect(normalizeNotificationRoutePath('/approval'), AppRoutes.asisten);
      expect(normalizeNotificationRoutePath('/approvals'), AppRoutes.asisten);
      expect(
        normalizeNotificationRoutePath('/dashboard/asisten/approval'),
        AppRoutes.asisten,
      );
    });

    test('maps legacy history routes to mandor route', () {
      expect(normalizeNotificationRoutePath('/history'), AppRoutes.mandor);
      expect(normalizeNotificationRoutePath('/panen'), AppRoutes.mandor);
      expect(
        normalizeNotificationRoutePath('/dashboard/mandor/history'),
        AppRoutes.mandor,
      );
    });

    test('maps manager section aliases to manager route', () {
      expect(
        normalizeNotificationRoutePath('/manager/notifications'),
        AppRoutes.manager,
      );
      expect(
        normalizeNotificationRoutePath('/manager/monitor'),
        AppRoutes.manager,
      );
      expect(
        normalizeNotificationRoutePath('/manager/analytics'),
        AppRoutes.manager,
      );
    });

    test('keeps unknown routes unchanged', () {
      expect(normalizeNotificationRoutePath('/custom/path'), '/custom/path');
      expect(normalizeNotificationRoutePath('/asisten'), '/asisten');
    });
  });
}
