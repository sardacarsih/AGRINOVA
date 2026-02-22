import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:internet_connection_checker/internet_connection_checker.dart';
import 'package:logger/logger.dart';

/// Network connectivity helper for app updates and sync operations
class ConnectivityHelper {
  static final ConnectivityHelper _instance = ConnectivityHelper._internal();
  factory ConnectivityHelper() => _instance;
  ConnectivityHelper._internal();

  final Connectivity _connectivity = Connectivity();
  final InternetConnectionChecker _internetChecker = InternetConnectionChecker.instance;
  final Logger _logger = Logger();

  StreamController<ConnectivityStatus>? _connectivityController;
  StreamSubscription? _connectivitySubscription;
  bool _isInitialized = false;

  /// Get connectivity status stream
  Stream<ConnectivityStatus> get onConnectivityChanged {
    if (!_isInitialized) {
      _initialize();
    }
    return _connectivityController!.stream;
  }

  /// Initialize connectivity monitoring
  void _initialize() {
    if (_isInitialized) return;

    _connectivityController = StreamController<ConnectivityStatus>.broadcast();
    
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen(
      (List<ConnectivityResult> results) async {
        final status = await _getConnectivityStatus(results);
        _connectivityController?.add(status);
        _logger.d('Connectivity changed: ${status.type} (hasInternet: ${status.hasInternet})');
      },
    );

    _isInitialized = true;
  }

  /// Get current connectivity status
  Future<ConnectivityStatus> getCurrentConnectivityStatus() async {
    final results = await _connectivity.checkConnectivity();
    return await _getConnectivityStatus(results);
  }

  /// Convert ConnectivityResult to ConnectivityStatus
  Future<ConnectivityStatus> _getConnectivityStatus(List<ConnectivityResult> results) async {
    if (results.isEmpty || results.first == ConnectivityResult.none) {
      return ConnectivityStatus(
        type: ConnectivityType.none,
        hasInternet: false,
        isMetered: false,
      );
    }

    final result = results.first;
    final hasInternet = await _internetChecker.hasConnection;
    
    ConnectivityType type;
    bool isMetered = false;

    switch (result) {
      case ConnectivityResult.wifi:
        type = ConnectivityType.wifi;
        break;
      case ConnectivityResult.mobile:
        type = ConnectivityType.mobile;
        isMetered = true;
        break;
      case ConnectivityResult.ethernet:
        type = ConnectivityType.ethernet;
        break;
      case ConnectivityResult.bluetooth:
        type = ConnectivityType.bluetooth;
        break;
      case ConnectivityResult.vpn:
        type = ConnectivityType.vpn;
        break;
      case ConnectivityResult.other:
        type = ConnectivityType.other;
        break;
      default:
        type = ConnectivityType.none;
    }

    return ConnectivityStatus(
      type: type,
      hasInternet: hasInternet,
      isMetered: isMetered,
    );
  }

  /// Check if device is online
  Future<bool> isOnline() async {
    final status = await getCurrentConnectivityStatus();
    return status.hasInternet;
  }

  /// Check if connection is Wi-Fi
  Future<bool> isWiFiConnected() async {
    final status = await getCurrentConnectivityStatus();
    return status.type == ConnectivityType.wifi && status.hasInternet;
  }

  /// Check if connection is metered (mobile data)
  Future<bool> isMeteredConnection() async {
    final status = await getCurrentConnectivityStatus();
    return status.isMetered;
  }

  /// Check if suitable for large downloads
  Future<bool> isSuitableForLargeDownloads() async {
    final status = await getCurrentConnectivityStatus();
    return status.hasInternet && !status.isMetered;
  }

  /// Wait for internet connection with timeout
  Future<bool> waitForConnection({Duration timeout = const Duration(seconds: 30)}) async {
    if (await isOnline()) return true;

    final completer = Completer<bool>();
    late StreamSubscription subscription;
    late Timer timeoutTimer;

    subscription = onConnectivityChanged.listen((status) {
      if (status.hasInternet) {
        subscription.cancel();
        timeoutTimer.cancel();
        completer.complete(true);
      }
    });

    timeoutTimer = Timer(timeout, () {
      subscription.cancel();
      if (!completer.isCompleted) {
        completer.complete(false);
      }
    });

    return completer.future;
  }

  /// Dispose resources
  void dispose() {
    _connectivitySubscription?.cancel();
    _connectivityController?.close();
    _isInitialized = false;
  }
}

/// Connectivity status model
class ConnectivityStatus {
  final ConnectivityType type;
  final bool hasInternet;
  final bool isMetered;

  const ConnectivityStatus({
    required this.type,
    required this.hasInternet,
    required this.isMetered,
  });

  /// Check if connection is available and suitable for updates
  bool get isSuitableForUpdates => hasInternet && !isMetered;

  /// Check if any connection is available
  bool get isConnected => type != ConnectivityType.none;

  @override
  String toString() {
    return 'ConnectivityStatus(type: $type, hasInternet: $hasInternet, isMetered: $isMetered)';
  }
}

/// Connectivity type enumeration
enum ConnectivityType {
  none,
  wifi,
  mobile,
  ethernet,
  bluetooth,
  vpn,
  other,
}
