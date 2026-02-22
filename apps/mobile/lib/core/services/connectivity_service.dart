import 'dart:async';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:internet_connection_checker/internet_connection_checker.dart';
import 'package:logger/logger.dart';
import 'config_service.dart';

enum NetworkStatus {
  online,
  offline,
  checking,
}

class ConnectivityService {
  static final Logger _logger = Logger();
  final Connectivity _connectivity;
  final InternetConnectionChecker _internetChecker = InternetConnectionChecker.instance;
  
  // For USB debugging: check local server as fallback
  final bool _useLocalServerFallback = true;
  
  final StreamController<NetworkStatus> _networkStatusController = 
      StreamController<NetworkStatus>.broadcast();
  
  late StreamSubscription<List<ConnectivityResult>> _connectivitySubscription;
  late StreamSubscription<InternetConnectionStatus> _internetSubscription;
  
  NetworkStatus _currentStatus = NetworkStatus.checking;

  ConnectivityService(this._connectivity);

  // Getters
  Stream<NetworkStatus> get networkStatusStream => _networkStatusController.stream;
  NetworkStatus get currentStatus => _currentStatus;
  bool get isOnline => _currentStatus == NetworkStatus.online;
  bool get isOffline => _currentStatus == NetworkStatus.offline;

  // Initialize the service
  Future<void> initialize() async {
    try {
      _logger.d('Initializing connectivity service');
      
      // Set up internet connection checker
      _internetChecker.checkInterval = const Duration(seconds: 10);
      
      // Check initial connection status
      await _checkInitialConnection();
      
      // Listen to connectivity changes
      _connectivitySubscription = _connectivity.onConnectivityChanged.listen(
        _onConnectivityChanged,
        onError: (error) {
          _logger.e('Connectivity stream error: $error');
          _updateNetworkStatus(NetworkStatus.offline);
        },
      );
      
      // Listen to internet connection status
      _internetSubscription = _internetChecker.onStatusChange.listen(
        _onInternetStatusChanged,
        onError: (error) {
          _logger.e('Internet connection stream error: $error');
          _updateNetworkStatus(NetworkStatus.offline);
        },
      );
      
      _logger.d('Connectivity service initialized successfully');
    } catch (e) {
      _logger.e('Error initializing connectivity service: $e');
      _updateNetworkStatus(NetworkStatus.offline);
    }
  }

  // Check initial connection status
  Future<void> _checkInitialConnection() async {
    try {
      final connectivityResult = await _connectivity.checkConnectivity();
      await _onConnectivityChanged(connectivityResult);
    } catch (e) {
      _logger.e('Error checking initial connection: $e');
      _updateNetworkStatus(NetworkStatus.offline);
    }
  }

  // Handle connectivity changes
  Future<void> _onConnectivityChanged(List<ConnectivityResult> result) async {
    try {
      _logger.d('Connectivity changed: $result');
      
      if (result.contains(ConnectivityResult.none)) {
        _updateNetworkStatus(NetworkStatus.offline);
        return;
      }
      
      // Even if connected to WiFi/Mobile, check actual internet connectivity
      _updateNetworkStatus(NetworkStatus.checking);
      
      // First try standard internet check
      final hasInternet = await _internetChecker.hasConnection;
      
      if (hasInternet) {
        _updateNetworkStatus(NetworkStatus.online);
        return;
      }
      
      // Fallback: Try to reach local server (for USB debugging scenarios)
      if (_useLocalServerFallback) {
        final hasLocalServer = await _checkLocalServerConnectivity();
        if (hasLocalServer) {
          _logger.i('📱 Connected via local server (USB debugging mode)');
          _updateNetworkStatus(NetworkStatus.online);
          return;
        }
      }
      
      _updateNetworkStatus(NetworkStatus.offline);
      
    } catch (e) {
      _logger.e('Error handling connectivity change: $e');
      _updateNetworkStatus(NetworkStatus.offline);
    }
  }

  /// Check if local development server is reachable (for USB debugging)
  Future<bool> _checkLocalServerConnectivity() async {
    try {
      final config = await ConfigService.getConfig();
      final healthUrl = '${config.baseUrl}/health';
      
      _logger.d('🔍 Checking local server connectivity: $healthUrl');
      
      final client = HttpClient();
      client.connectionTimeout = const Duration(seconds: 3);
      
      final request = await client.getUrl(Uri.parse(healthUrl));
      final response = await request.close().timeout(
        const Duration(seconds: 3),
        onTimeout: () => throw TimeoutException('Local server check timeout'),
      );
      
      await response.drain();
      client.close(force: true);
      
      final isSuccess = response.statusCode >= 200 && response.statusCode < 400;
      _logger.d('📊 Local server health check: ${isSuccess ? 'SUCCESS' : 'FAILED'} (${response.statusCode})');
      
      return isSuccess;
    } catch (e) {
      _logger.d('❌ Local server connectivity check failed: $e');
      return false;
    }
  }

  // Handle internet status changes
  void _onInternetStatusChanged(InternetConnectionStatus status) {
    try {
      _logger.d('Internet status changed: $status');
      
      switch (status) {
        case InternetConnectionStatus.connected:
          _updateNetworkStatus(NetworkStatus.online);
          break;
        case InternetConnectionStatus.disconnected:
          _updateNetworkStatus(NetworkStatus.offline);
          break;
        case InternetConnectionStatus.slow:
          _updateNetworkStatus(NetworkStatus.online);
          break;
      }
    } catch (e) {
      _logger.e('Error handling internet status change: $e');
      _updateNetworkStatus(NetworkStatus.offline);
    }
  }

  // Update network status
  void _updateNetworkStatus(NetworkStatus status) {
    if (_currentStatus != status) {
      _currentStatus = status;
      _networkStatusController.add(status);
      _logger.d('Network status updated: $status');
    }
  }

  // Manual connection check
  Future<bool> checkConnection() async {
    try {
      _updateNetworkStatus(NetworkStatus.checking);
      
      final connectivityResult = await _connectivity.checkConnectivity();
      
      if (connectivityResult.contains(ConnectivityResult.none)) {
        _updateNetworkStatus(NetworkStatus.offline);
        return false;
      }
      
      // First try standard internet check
      final hasInternet = await _internetChecker.hasConnection;
      
      if (hasInternet) {
        _updateNetworkStatus(NetworkStatus.online);
        return true;
      }
      
      // Fallback: Try to reach local server (for USB debugging scenarios)
      if (_useLocalServerFallback) {
        final hasLocalServer = await _checkLocalServerConnectivity();
        if (hasLocalServer) {
          _logger.i('📱 Connected via local server (USB debugging mode)');
          _updateNetworkStatus(NetworkStatus.online);
          return true;
        }
      }
      
      _updateNetworkStatus(NetworkStatus.offline);
      return false;
    } catch (e) {
      _logger.e('Error checking connection: $e');
      _updateNetworkStatus(NetworkStatus.offline);
      return false;
    }
  }

  // Get connection type
  Future<List<ConnectivityResult>> getConnectionType() async {
    try {
      return await _connectivity.checkConnectivity();
    } catch (e) {
      _logger.e('Error getting connection type: $e');
      return [ConnectivityResult.none];
    }
  }

  // Get connection info
  Future<Map<String, dynamic>> getConnectionInfo() async {
    try {
      final connectivityResult = await _connectivity.checkConnectivity();
      final hasInternet = await _internetChecker.hasConnection;
      
      return {
        'type': connectivityResult.toString(),
        'hasInternet': hasInternet,
        'status': _currentStatus.toString(),
        'isOnline': isOnline,
        'lastUpdate': DateTime.now().toIso8601String(),
      };
    } catch (e) {
      _logger.e('Error getting connection info: $e');
      return {
        'type': 'unknown',
        'hasInternet': false,
        'status': NetworkStatus.offline.toString(),
        'isOnline': false,
        'lastUpdate': DateTime.now().toIso8601String(),
      };
    }
  }

  // Check if connected to WiFi
  Future<bool> isConnectedToWiFi() async {
    try {
      final result = await _connectivity.checkConnectivity();
      return result.contains(ConnectivityResult.wifi);
    } catch (e) {
      _logger.e('Error checking WiFi connection: $e');
      return false;
    }
  }

  // Check if connected to mobile data
  Future<bool> isConnectedToMobile() async {
    try {
      final result = await _connectivity.checkConnectivity();
      return result.contains(ConnectivityResult.mobile);
    } catch (e) {
      _logger.e('Error checking mobile connection: $e');
      return false;
    }
  }

  // Wait for network to be online
  Future<void> waitForOnline({Duration? timeout}) async {
    try {
      if (isOnline) return;
      
      final completer = Completer<void>();
      late StreamSubscription<NetworkStatus> subscription;
      Timer? timer;
      
      subscription = networkStatusStream.listen((status) {
        if (status == NetworkStatus.online) {
          subscription.cancel();
          timer?.cancel();
          if (!completer.isCompleted) {
            completer.complete();
          }
        }
      });
      
      if (timeout != null) {
        timer = Timer(timeout, () {
          subscription.cancel();
          if (!completer.isCompleted) {
            completer.completeError(TimeoutException('Network timeout', timeout));
          }
        });
      }
      
      await completer.future;
    } catch (e) {
      _logger.e('Error waiting for online: $e');
      rethrow;
    }
  }

  // Dispose resources
  Future<void> dispose() async {
    try {
      await _connectivitySubscription.cancel();
      await _internetSubscription.cancel();
      await _networkStatusController.close();
      _logger.d('Connectivity service disposed');
    } catch (e) {
      _logger.e('Error disposing connectivity service: $e');
    }
  }
}