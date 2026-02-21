import 'dart:async';
import 'dart:io';

import 'package:graphql_flutter/graphql_flutter.dart';

/// Converts technical sync exceptions into user-friendly Indonesian messages.
class SyncErrorMessageHelper {
  static String toUserMessage(
    Object error, {
    String action = 'sinkronisasi data',
  }) {
    final normalizedAction = _normalizeAction(action);

    if (error is TimeoutException) {
      return 'Koneksi ke server timeout saat $normalizedAction. Coba lagi beberapa saat.';
    }

    if (error is SocketException) {
      return _offlineMessage(normalizedAction);
    }

    if (error is OperationException) {
      return _fromOperationException(error, normalizedAction);
    }

    final raw = _extractRawError(error);
    final lowered = raw.toLowerCase();

    if (_isAlreadyFriendly(raw)) {
      return raw;
    }

    if (_containsAny(lowered, _authKeywords)) {
      return 'Sesi Anda berakhir. Silakan login ulang lalu coba $normalizedAction.';
    }

    if (_containsAny(lowered, _timeoutKeywords)) {
      return 'Koneksi ke server timeout saat $normalizedAction. Coba lagi beberapa saat.';
    }

    if (_containsAny(lowered, _networkKeywords)) {
      return _offlineMessage(normalizedAction);
    }

    if (_containsAny(lowered, _serverKeywords)) {
      return 'Server sedang bermasalah saat $normalizedAction. Silakan coba lagi nanti.';
    }

    return 'Terjadi kendala saat $normalizedAction. Silakan coba lagi.';
  }

  static String _fromOperationException(
    OperationException error,
    String action,
  ) {
    final isUnauthenticated = error.graphqlErrors.any((graphqlError) {
      final code = graphqlError.extensions?['code']?.toString().toUpperCase();
      final message = graphqlError.message.toLowerCase();
      return code == 'UNAUTHENTICATED' ||
          message.contains('unauthorized') ||
          message.contains('authentication');
    });

    if (isUnauthenticated) {
      return 'Sesi Anda berakhir. Silakan login ulang lalu coba $action.';
    }

    final details = [
      error.toString(),
      if (error.linkException != null) error.linkException.toString(),
      ...error.graphqlErrors.map((graphqlError) => graphqlError.message),
    ].join(' | ').toLowerCase();

    if (_containsAny(details, _timeoutKeywords)) {
      return 'Koneksi ke server timeout saat $action. Coba lagi beberapa saat.';
    }

    if (_containsAny(details, _networkKeywords)) {
      return _offlineMessage(action);
    }

    if (_containsAny(details, _serverKeywords)) {
      return 'Server sedang bermasalah saat $action. Silakan coba lagi nanti.';
    }

    if (_containsAny(details, _authKeywords)) {
      return 'Sesi Anda berakhir. Silakan login ulang lalu coba $action.';
    }

    if (error.graphqlErrors.isNotEmpty) {
      return 'Sinkronisasi ditolak server. Periksa data lalu coba lagi.';
    }

    return 'Terjadi kendala saat $action. Silakan coba lagi.';
  }

  static String _extractRawError(Object error) {
    final raw = error.toString().trim();
    return raw.replaceFirst(RegExp(r'^Exception:\s*'), '').trim();
  }

  static String _normalizeAction(String action) {
    final trimmed = action.trim();
    if (trimmed.isEmpty) return 'sinkronisasi data';
    return trimmed;
  }

  static bool _isAlreadyFriendly(String message) {
    final lowered = message.toLowerCase();
    if (message.length > 220) return false;
    if (_containsAny(lowered, _technicalNoiseKeywords)) return false;
    return _containsAny(
      lowered,
      const [
        'silakan',
        'periksa',
        'koneksi',
        'coba lagi',
        'sesi',
        'login ulang',
        'server',
      ],
    );
  }

  static bool _containsAny(String source, List<String> patterns) {
    for (final pattern in patterns) {
      if (source.contains(pattern)) return true;
    }
    return false;
  }

  static String _offlineMessage(String action) {
    return 'Server tidak dapat dihubungi saat $action. Periksa koneksi internet, lalu coba lagi. Data tetap aman di perangkat.';
  }

  static const List<String> _networkKeywords = [
    'socketexception',
    'failed host lookup',
    'connection refused',
    'network is unreachable',
    'no route to host',
    'connection reset',
    'connection closed',
    'dns',
    'handshakeexception',
    'xmlhttprequest error',
    'clientexception',
  ];

  static const List<String> _timeoutKeywords = [
    'timeout',
    'timed out',
    'deadline exceeded',
  ];

  static const List<String> _serverKeywords = [
    '500',
    '502',
    '503',
    '504',
    'internal server error',
    'service unavailable',
    'bad gateway',
    'gateway timeout',
  ];

  static const List<String> _authKeywords = [
    '401',
    '403',
    'unauthorized',
    'forbidden',
    'unauthenticated',
    'token',
  ];

  static const List<String> _technicalNoiseKeywords = [
    'operationexception',
    'graphql',
    'sqlstate',
    'stacktrace',
    'linkexception',
    'apollo',
  ];
}
