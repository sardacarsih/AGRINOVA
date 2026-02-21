
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:agrinova_mobile/core/constants/api_constants.dart';

void main() {
  group('Login API Integration Test', () {
    final client = http.Client();
    final url = Uri.parse('${ApiConstants.baseUrl}/api/v1/auth/login');

    test('should return a JWT token when given valid credentials', () async {
      // Arrange
      final body = {
        'username': 'super-admin@agrinova.com',
        'password': 'admin123',
        'deviceId': 'test-device-id-integration',
        'deviceFingerprint': 'test-fingerprint-integration'
      };

      // Act
      final response = await client.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );

      // Assert
      expect(response.statusCode, 201);
      final jsonResponse = jsonDecode(response.body);
      expect(jsonResponse, contains('accessToken'));
      expect(jsonResponse['accessToken'], isA<String>());
    });

    test('should return a 401 error when given invalid credentials', () async {
      // Arrange
      final body = {
        'username': 'wronguser',
        'password': 'wrongpassword',
        'deviceId': 'test-device-id-integration',
        'deviceFingerprint': 'test-fingerprint-integration'
      };

      // Act
      final response = await client.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );

      // Assert
      expect(response.statusCode, 401);
    });
  });
}
