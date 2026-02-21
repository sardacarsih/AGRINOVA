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
    _connectivity.onConnectivityChanged.listen((ConnectivityResult result) {
      _logger.d('Network connectivity changed: $result');
      _connectivityController.add(result);
    }).onError((error) {
      _logger.e('Error in connectivity listener', error: error);
    });
  }
  
  Stream<ConnectivityResult> get connectivityStream => _connectivityController.stream;
  
  Future<ConnectivityResult> getNetworkStatus() async {
    try {
      final result = await _connectivity.checkConnectivity();
      _logger.d('Current network status: $result');
      return result;
    } catch (e) {
      _logger.e('Error checking network status', error: e);
      return ConnectivityResult.none;
    }
  }
  
  Future<Map<String, dynamic>> getNetworkInfo() async {
    try {
      final result = await _connectivity.checkConnectivity();
      return {
        'status': result,
        'isConnected': result != ConnectivityResult.none,
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