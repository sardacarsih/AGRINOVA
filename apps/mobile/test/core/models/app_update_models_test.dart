import 'package:flutter_test/flutter_test.dart';
import 'package:agrinova_mobile/core/models/app_update_models.dart';

AppUpdateInfo _buildInfo({
  required String latestVersion,
  Map<String, dynamic>? metadata,
}) {
  return AppUpdateInfo(
    latestVersion: latestVersion,
    latestBuildNumber: 120,
    updateType: UpdateType.recommended,
    deliveryMethod: UpdateDeliveryMethod.playStore,
    metadata: metadata,
  );
}

void main() {
  group('AppUpdateInfo.displayVersion', () {
    test('ignores non-version metadata tokens like play_store', () {
      final info = _buildInfo(
        latestVersion: 'build 120',
        metadata: {
          'source': 'play_store',
          'versionLabelSource': 'play_store',
          'trackScope': 'play_store_managed',
        },
      );

      expect(info.displayVersion, 'versi terbaru');
    });

    test('uses semantic version from metadata when latestVersion is build-only', () {
      final info = _buildInfo(
        latestVersion: 'build 120',
        metadata: {
          'versionName': '1.1.8-dev.45',
        },
      );

      expect(info.displayVersion, '1.1.8-dev.45');
    });
  });
}
