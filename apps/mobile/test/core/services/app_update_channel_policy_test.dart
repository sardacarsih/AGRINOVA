import 'package:agrinova_mobile/core/services/app_update_channel_policy.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('resolveReleaseChannelFromVersion', () {
    test('returns internal for dev suffix', () {
      expect(
        resolveReleaseChannelFromVersion('1.1.8-dev.123'),
        equals('internal'),
      );
    });

    test('returns closed for rc suffix', () {
      expect(
        resolveReleaseChannelFromVersion('1.1.8-rc.123'),
        equals('closed'),
      );
    });

    test('returns production for plain semver', () {
      expect(resolveReleaseChannelFromVersion('1.1.8'), equals('production'));
    });
  });

  group('resolveReleaseChannel', () {
    test('prefers metadata releaseChannel when valid', () {
      expect(
        resolveReleaseChannel(
          versionLabel: '1.1.8-dev.123',
          metadata: const {'releaseChannel': 'production'},
        ),
        equals('production'),
      );
    });

    test(
      'falls back to version label when metadata releaseChannel invalid',
      () {
        expect(
          resolveReleaseChannel(
            versionLabel: '1.1.8-rc.11',
            metadata: const {'releaseChannel': 'staging'},
          ),
          equals('closed'),
        );
      },
    );
  });

  group('isUpdateChannelCompatible', () {
    test('returns true when installed and update channels are equal', () {
      final result = isUpdateChannelCompatible(
        installedVersion: '1.1.8-dev.123',
        updateVersionLabel: '1.1.9-dev.200',
      );
      expect(result, isTrue);
    });

    test('returns false when channel mismatch and no all scope', () {
      final result = isUpdateChannelCompatible(
        installedVersion: '1.1.8-dev.123',
        updateVersionLabel: '1.1.9',
      );
      expect(result, isFalse);
    });

    test('returns true when releaseScope is all despite channel mismatch', () {
      final result = isUpdateChannelCompatible(
        installedVersion: '1.1.8-dev.123',
        updateVersionLabel: '1.1.9',
        updateMetadata: const {'releaseScope': 'all'},
      );
      expect(result, isTrue);
    });

    test('supports explicit update metadata channel', () {
      final result = isUpdateChannelCompatible(
        installedVersion: '1.1.8-rc.123',
        updateVersionLabel: 'build 1771851552',
        updateMetadata: const {'releaseChannel': 'closed'},
      );
      expect(result, isTrue);
    });
  });
}
