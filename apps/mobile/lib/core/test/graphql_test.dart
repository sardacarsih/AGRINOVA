import 'package:flutter/material.dart';
import '../di/service_locator.dart';
import '../services/auth_service.dart';
import '../services/device_service.dart';

/// Simple test widget to verify GraphQL integration
class GraphQLTestWidget extends StatefulWidget {
  const GraphQLTestWidget({Key? key}) : super(key: key);

  @override
  State<GraphQLTestWidget> createState() => _GraphQLTestWidgetState();
}

class _GraphQLTestWidgetState extends State<GraphQLTestWidget> {
  late AuthService _authService;
  String _status = 'Initializing...';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _initializeServices();
  }

  Future<void> _initializeServices() async {
    try {
      setState(() {
        _status = 'Initializing services...';
        _isLoading = true;
      });

      // Initialize service locator
      await ServiceLocator.initialize();
      
      // Get auth service
      _authService = ServiceLocator.get<AuthService>();
      
      setState(() {
        _status = 'Services initialized successfully!';
        _isLoading = false;
      });

      // Test device info
      await _testDeviceInfo();
      
    } catch (e) {
      setState(() {
        _status = 'Initialization failed: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _testDeviceInfo() async {
    try {
      setState(() {
        _status = 'Testing device info...';
      });

      final deviceInfo = await DeviceService.getDeviceInfo();
      
      setState(() {
        _status = 'Device Info:\n'
                 'ID: ${deviceInfo.deviceId}\n'
                 'Platform: ${deviceInfo.platform}\n'
                 'Fingerprint: ${deviceInfo.fingerprint}';
      });
    } catch (e) {
      setState(() {
        _status = 'Device info test failed: $e';
      });
    }
  }

  Future<void> _testLogin() async {
    try {
      setState(() {
        _status = 'Testing login...';
        _isLoading = true;
      });

      // Test login with demo credentials
      final success = await _authService.login(
        identifier: 'superadmin',
        password: 'admin123',
      );

      setState(() {
        _status = success 
            ? 'Login successful!\nUser: ${_authService.currentUser?.username}'
            : 'Login failed: ${_authService.lastError}';
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _status = 'Login test failed: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _testAuthStatus() async {
    try {
      setState(() {
        _status = 'Getting auth status...';
      });

      final status = await _authService.getAuthStatus();
      
      setState(() {
        _status = 'Auth Status:\n'
                 'Authenticated: ${status['isAuthenticated']}\n'
                 'Online: ${status['isOnline']}\n'
                 'User: ${status['currentUser']?['username'] ?? 'None'}\n'
                 'Device: ${status['deviceInfo']?['deviceId'] ?? 'None'}';
      });
    } catch (e) {
      setState(() {
        _status = 'Auth status test failed: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('GraphQL Integration Test'),
        backgroundColor: Colors.green,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Text(
                  _status,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 12,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (_isLoading)
              const Center(child: CircularProgressIndicator())
            else ...[
              ElevatedButton(
                onPressed: _testLogin,
                child: const Text('Test Login'),
              ),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: _testAuthStatus,
                child: const Text('Check Auth Status'),
              ),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: _testDeviceInfo,
                child: const Text('Test Device Info'),
              ),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () async {
                  await _authService.logout();
                  setState(() {
                    _status = 'Logged out successfully';
                  });
                },
                child: const Text('Logout'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Test function to verify GraphQL connectivity
Future<void> testGraphQLConnection() async {
  try {
    print('🧪 Testing GraphQL Integration...');
    
    // Initialize services
    await ServiceLocator.initialize();
    print('✅ Services initialized');
    
    // Test device info
    final deviceInfo = await DeviceService.getDeviceInfo();
    print('✅ Device info: ${deviceInfo.deviceId}');
    
    // Test auth service
    final authService = ServiceLocator.get<AuthService>();
    print('✅ Auth service retrieved');
    
    // Test connectivity
    final status = await authService.getAuthStatus();
    print('✅ Auth status: ${status['isOnline']}');
    
    print('🎉 GraphQL integration test completed successfully!');
  } catch (e) {
    print('❌ GraphQL integration test failed: $e');
    rethrow;
  }
}