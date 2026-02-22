import 'dart:async';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:logger/logger.dart';
import 'config_service.dart';

/// Three-state status that decouples network presence from server reachability.
enum AppStatus {
  /// No network interface (airplane mode, etc.)
  noInternet,

  /// Network present but the Agrinova server is unreachable or returned non-2xx.
  serverDown,

  /// Server responded HTTP 2xx – full online mode.
  online,
}

/// Stateless service for checking server reachability.
///
/// Not registered in the GetIt DI container – callers simply do
/// `ServerStatusService().checkStatus()`.
///
/// This method NEVER throws; all exceptions are caught and mapped to an
/// appropriate [AppStatus].
class ServerStatusService {
  static final Logger _logger = Logger();
  static const Duration _timeout = Duration(seconds: 5);

  /// Two-stage reachability probe.
  ///
  /// **Stage A** – `connectivity_plus`: if the result is
  /// [ConnectivityResult.none] there is no network interface; return
  /// [AppStatus.noInternet] immediately without making any HTTP request.
  ///
  /// **Stage B** – HTTP GET to `{baseUrl}/health`. A 2xx status code means
  /// [AppStatus.online]; any timeout, connection error, or non-2xx status
  /// means [AppStatus.serverDown].
  Future<AppStatus> checkStatus() async {
    // ── Stage A: network interface check ─────────────────────────────
    try {
      final result = await Connectivity().checkConnectivity();
      if (result.contains(ConnectivityResult.none)) {
        _logger.d('ServerStatusService: no network interface → noInternet');
        return AppStatus.noInternet;
      }
    } catch (e) {
      // If the connectivity check itself fails we cannot be certain there is
      // no network, so fall through to the HTTP check.
      _logger.w('ServerStatusService: connectivity check error: $e');
    }

    // ── Stage B: HTTP health check ────────────────────────────────────
    try {
      final config = await ConfigService.getConfig();
      final healthUrl = '${config.baseUrl}/health';
      _logger.d('ServerStatusService: checking $healthUrl');

      final client = HttpClient();
      client.connectionTimeout = _timeout;
      final request =
          await client.getUrl(Uri.parse(healthUrl)).timeout(_timeout);
      final response = await request.close().timeout(_timeout);
      await response.drain<void>();
      client.close(force: true);

      final isSuccess =
          response.statusCode >= 200 && response.statusCode < 300;
      _logger.d(
        'ServerStatusService: ${response.statusCode} '
        '→ ${isSuccess ? "online" : "serverDown"}',
      );
      return isSuccess ? AppStatus.online : AppStatus.serverDown;
    } catch (e) {
      _logger.d('ServerStatusService: health check failed → serverDown: $e');
      return AppStatus.serverDown;
    }
  }
}
