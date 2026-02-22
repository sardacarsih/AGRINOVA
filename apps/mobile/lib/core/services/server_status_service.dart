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

/// Result of a server status check, including diagnostic details.
class AppStatusResult {
  final AppStatus status;

  /// Human-readable error detail for [AppStatus.serverDown], e.g. "Timeout",
  /// "Cannot reach server", "SSL error", "HTTP 503". Null when [status] is
  /// [AppStatus.online] or [AppStatus.noInternet].
  final String? errorDetail;

  /// The URL that was checked in Stage B. Useful for diagnostics.
  final String? checkedUrl;

  const AppStatusResult(this.status, {this.errorDetail, this.checkedUrl});
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
  static const Duration _timeout = Duration(seconds: 10);

  /// Two-stage reachability probe.
  ///
  /// **Stage A** – `connectivity_plus`: if the result is
  /// [ConnectivityResult.none] there is no network interface; return
  /// [AppStatus.noInternet] immediately without making any HTTP request.
  ///
  /// **Stage B** – HTTP GET to `{baseUrl}/health`. A 2xx status code means
  /// [AppStatus.online]; any timeout, connection error, or non-2xx status
  /// means [AppStatus.serverDown].
  Future<AppStatusResult> checkStatus() async {
    // ── Stage A: network interface check ─────────────────────────────
    try {
      final result = await Connectivity().checkConnectivity();
      if (result.contains(ConnectivityResult.none)) {
        _logger.d('ServerStatusService: no network interface → noInternet');
        return const AppStatusResult(AppStatus.noInternet);
      }
    } catch (e) {
      // If the connectivity check itself fails we cannot be certain there is
      // no network, so fall through to the HTTP check.
      _logger.w('ServerStatusService: connectivity check error: $e');
    }

    // ── Stage B: HTTP health check ────────────────────────────────────
    String? healthUrl;
    try {
      final config = await ConfigService.getConfig();
      healthUrl = '${config.baseUrl}/health';
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
      return AppStatusResult(
        isSuccess ? AppStatus.online : AppStatus.serverDown,
        checkedUrl: healthUrl,
        errorDetail: isSuccess ? null : 'HTTP ${response.statusCode}',
      );
    } catch (e) {
      _logger.d('ServerStatusService: health check failed → serverDown: $e');
      final errorDetail = e is TimeoutException
          ? 'Timeout (>${_timeout.inSeconds}s)'
          : e is SocketException
              ? 'Server tidak terjangkau'
              : e is HandshakeException
                  ? 'SSL error'
                  : 'Koneksi gagal';
      return AppStatusResult(
        AppStatus.serverDown,
        checkedUrl: healthUrl,
        errorDetail: errorDetail,
      );
    }
  }
}
