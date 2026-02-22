import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:logger/logger.dart';

/// Network service for monitoring connectivity and network status
class NetworkService {
  static final Logger _logger = Logger();
  final Connectivity _connectivity = Connectivity();
  
  final StreamController<ConnectivityResult> _connectivityController = 
      StreamController<ConnectivityResult>.broadcast();
  
  NetworkService() {
    _initializeConnectivityListener();
  }
  
  void _initializeConnectivityListener() {
    _connectivity.onConnectivityChanged.listen((List<ConnectivityResult> result) {
      final status = result.isNotEmpty ? result.first : ConnectivityResult.none;
      _logger.d('Network connectivity changed: $status');
      _connectivityController.add(status);
    }).onError((error) {
      _logger.e('Error in connectivity listener', error: error);
    });
  }
  
  Stream<ConnectivityResult> get connectivityStream => _connectivityController.stream;
  
  Future<ConnectivityResult> getNetworkStatus() async {
    try {
      final result = await _connectivity.checkConnectivity();
      final status = result.isNotEmpty ? result.first : ConnectivityResult.none;
      _logger.d('Current network status: $status');
      return status;
    } catch (e) {
      _logger.e('Error checking network status', error: e);
      return ConnectivityResult.none;
    }
  }
  
  Future<Map<String, dynamic>> getNetworkInfo() async {
    try {
      final result = await _connectivity.checkConnectivity();
      final status = result.isNotEmpty ? result.first : ConnectivityResult.none;
      return {
        'status': status,
        'isConnected': status != ConnectivityResult.none,
        'timestamp': DateTime.now().toIso8601String(),
      };
    } catch (e) {
      _logger.e('Error getting network info', error: e);
      return {
        'status': ConnectivityResult.none,
        'isConnected': false,
        'timestamp': DateTime.now().toIso8601String(),
        'error': e.toString(),
      };
    }
  }
  
  void dispose() {
    _connectivityController.close();
  }
}
