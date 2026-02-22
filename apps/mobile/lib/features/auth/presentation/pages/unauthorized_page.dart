import 'package:flutter/material.dart';
import 'package:logger/logger.dart';

import '../../../../core/routes/app_routes.dart';
import '../../../../core/services/role_service.dart';

class UnauthorizedPage extends StatelessWidget {
  static final Logger _logger = Logger();
  
  final String attemptedRoute;
  final String userRole;

  const UnauthorizedPage({
    super.key,
    required this.attemptedRoute,
    required this.userRole,
  });

  @override
  Widget build(BuildContext context) {
    _logger.w('Unauthorized access attempt: Route=$attemptedRoute, Role=$userRole');
    
    final roleName = RoleService.getRoleDisplayName(userRole);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Access Denied'),
        backgroundColor: Colors.red[600],
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Error Icon
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.red[50],
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.block,
                size: 64,
                color: Colors.red[600],
              ),
            ),
            
            const SizedBox(height: 32),
            
            // Title
            Text(
              'Access Denied',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: Colors.red[700],
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: 16),
            
            // Message
            Text(
              'Your role ($roleName) does not have permission to access this feature.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: 8),
            
            // Attempted route info
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Attempted to access: $attemptedRoute',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontFamily: 'monospace',
                  color: Colors.grey[700],
                ),
                textAlign: TextAlign.center,
              ),
            ),
            
            const SizedBox(height: 40),
            
            // Available features info
            _buildAvailableFeaturesInfo(context),
            
            const SizedBox(height: 32),
            
            // Action buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                // Go back button
                OutlinedButton.icon(
                  onPressed: () {
                    if (Navigator.canPop(context)) {
                      Navigator.pop(context);
                    } else {
                      _navigateToUserDashboard(context);
                    }
                  },
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Go Back'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                ),
                
                // Go to dashboard button
                ElevatedButton.icon(
                  onPressed: () => _navigateToUserDashboard(context),
                  icon: const Icon(Icons.dashboard),
                  label: const Text('My Dashboard'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    backgroundColor: Theme.of(context).primaryColor,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Contact support button
            TextButton.icon(
              onPressed: () => _showContactSupport(context),
              icon: const Icon(Icons.support_agent),
              label: const Text('Contact Support'),
              style: TextButton.styleFrom(
                foregroundColor: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildAvailableFeaturesInfo(BuildContext context) {
    final features = RoleService.getDashboardFeatures(userRole);
    
    if (features.isEmpty) {
      return const SizedBox.shrink();
    }
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.info_outline,
                color: Colors.blue[600],
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Available Features for $userRole',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: Colors.blue[800],
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: features.take(6).map((feature) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _formatFeatureName(feature),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.blue[700],
                    fontSize: 12,
                  ),
                ),
              );
            }).toList(),
          ),
          if (features.length > 6)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'and ${features.length - 6} more...',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.blue[600],
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
        ],
      ),
    );
  }
  
  String _formatFeatureName(String feature) {
    return feature
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word.isNotEmpty 
            ? word[0].toUpperCase() + word.substring(1).toLowerCase()
            : word)
        .join(' ');
  }
  
  void _navigateToUserDashboard(BuildContext context) {
    final userDashboard = AppRoutes.getDashboardRoute(userRole);
    Navigator.pushNamedAndRemoveUntil(
      context,
      userDashboard,
      (route) => false,
    );
  }
  
  void _showContactSupport(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Contact Support'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'If you believe you should have access to this feature, please contact your system administrator or IT support team.',
            ),
            const SizedBox(height: 16),
            const Text(
              'Include the following information:',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text('• Your role: $userRole'),
            Text('• Attempted route: $attemptedRoute'),
            Text('• Date/Time: ${DateTime.now().toString()}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Implement actual support contact functionality
              // This could open email app, show phone number, or submit a support ticket
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Support contact functionality not implemented yet'),
                  backgroundColor: Colors.orange,
                ),
              );
            },
            child: const Text('Send Report'),
          ),
        ],
      ),
    );
  }
}
