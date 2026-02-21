import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/services/role_service.dart';
import '../../../../core/config/app_config.dart';
import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../../shared/widgets/logout_menu_widget.dart';
import '../../../../shared/widgets/auth_listener_wrapper.dart';

class SuperAdminPage extends StatelessWidget {
  const SuperAdminPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AuthListenerWrapper(
      child: BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is AuthAuthenticated) {
          const role = 'super_admin';
          final features = RoleService.getDashboardFeatures(role);
          final permissions = RoleService.getRolePermissions(role);
          final dataScope = RoleService.getDataAccessScope(role);
          
          return Scaffold(
            appBar: AppBar(
              title: Text(RoleService.getRoleDisplayName(role)),
              backgroundColor: Colors.red.shade700,
              foregroundColor: Colors.white,
              actions: [
                IconButton(
                  icon: const Icon(Icons.security),
                  onPressed: () {
                    // Navigate to security settings
                  },
                  tooltip: 'Security Settings',
                ),
                IconButton(
                  icon: const Icon(Icons.notifications),
                  onPressed: () {
                    // Navigate to notifications
                  },
                  tooltip: 'Notifications',
                ),
                LogoutMenuWidget(
                  username: state.user.username,
                  role: RoleService.getRoleDisplayName(state.user.role),
                ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome Card
            Card(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.red.shade700, Colors.red.shade500],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Welcome, Super Administrator',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Global System Administration & Multi-Company Oversight',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.white.withOpacity(0.9),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          'Data Access: ${dataScope.toUpperCase()}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Quick Actions Grid
            Text(
              'System Administration',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.2,
              children: [
                _buildActionCard(
                  context,
                  'Multi-Company\nManagement',
                  Icons.corporate_fare,
                  Colors.blue,
                  () => _showFeatureDialog(context, 'Multi-Company Management'),
                ),
                if (features.contains('user_management'))
                  _buildActionCard(
                    context,
                    'Global User\nManagement',
                    Icons.supervised_user_circle,
                    Colors.green,
                    () => _showFeatureDialog(context, 'Global User Management'),
                  ),
                if (features.contains('system_admin'))
                  _buildActionCard(
                    context,
                    'System\nAdministration',
                    Icons.admin_panel_settings,
                    Colors.red,
                    () => _showFeatureDialog(context, 'System Administration'),
                  ),
                _buildActionCard(
                  context,
                  'Security\nManagement',
                  Icons.security,
                  Colors.orange,
                  () => _showFeatureDialog(context, 'Security Management'),
                ),
                _buildActionCard(
                  context,
                  'Audit\nLogs',
                  Icons.history,
                  Colors.purple,
                  () => _showFeatureDialog(context, 'Audit Logs'),
                ),
                if (features.contains('monitoring'))
                  _buildActionCard(
                    context,
                    'Global\nMonitoring',
                    Icons.monitor,
                    Colors.teal,
                    () => _showFeatureDialog(context, 'Global Monitoring'),
                  ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // System Statistics
            Text(
              'Global Statistics',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    context,
                    'Total Companies',
                    '5',
                    Icons.corporate_fare,
                    Colors.blue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    context,
                    'Total Estates',
                    '127',
                    Icons.business,
                    Colors.green,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    context,
                    'Total Users',
                    '2,847',
                    Icons.people,
                    Colors.orange,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    context,
                    'System Uptime',
                    '99.9%',
                    Icons.schedule,
                    Colors.green.shade700,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // System Health
            Text(
              'System Health',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    _buildHealthItem('API Server', 'Online', Colors.green, 0.98),
                    const Divider(height: 24),
                    _buildHealthItem('Database', 'Online', Colors.green, 0.95),
                    const Divider(height: 24),
                    _buildHealthItem('Redis Cache', 'Online', Colors.green, 0.97),
                    const Divider(height: 24),
                    _buildHealthItem('Firebase', 'Online', Colors.green, 0.99),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Recent System Activities
            Text(
              'Recent System Activities',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Card(
              child: Column(
                children: [
                  _buildActivityItem(
                    context,
                    'New Company Registered',
                    'PT Agrinova Sejahtera registered by admin@agrinova.com',
                    Icons.corporate_fare,
                    Colors.green,
                    '1 hour ago',
                  ),
                  const Divider(height: 1),
                  _buildActivityItem(
                    context,
                    'Security Alert',
                    'Multiple login attempts detected for user admin@company.com',
                    Icons.warning,
                    Colors.red,
                    '3 hours ago',
                  ),
                  const Divider(height: 1),
                  _buildActivityItem(
                    context,
                    'System Update',
                    'Mobile app version 1.2.0 deployed successfully',
                    Icons.system_update,
                    Colors.blue,
                    '6 hours ago',
                  ),
                  const Divider(height: 1),
                  _buildActivityItem(
                    context,
                    'Database Backup',
                    'Automated daily backup completed successfully',
                    Icons.backup,
                    Colors.teal,
                    '12 hours ago',
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Permissions & Capabilities
            Text(
              'System Privileges',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.admin_panel_settings,
                          color: Colors.red.shade700,
                          size: 24,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'FULL SYSTEM ACCESS',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: Colors.red.shade700,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Permissions:',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: permissions.map((permission) {
                        return Chip(
                          label: Text(
                            permission.replaceAll('_', ' ').toUpperCase(),
                            style: const TextStyle(fontSize: 10),
                          ),
                          backgroundColor: Colors.red.shade100,
                          labelStyle: TextStyle(color: Colors.red.shade700),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
            bottomNavigationBar: _buildBottomNavigation(context, features),
          );
        }
        
        return Scaffold(
          appBar: AppBar(title: Text('Super Admin Dashboard')),
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Loading dashboard...'),
              ],
            ),
          ),
        );
      },
      ),
    );
  }

  Widget _buildActionCard(
    BuildContext context,
    String title,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 32,
                color: color,
              ),
              const SizedBox(height: 8),
              Text(
                title,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleSmall,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard(
    BuildContext context,
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                Icon(
                  icon,
                  color: color,
                  size: 20,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: color,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHealthItem(String service, String status, Color color, double health) {
    return Row(
      children: [
        Expanded(
          flex: 2,
          child: Text(service),
        ),
        Expanded(
          flex: 1,
          child: Text(
            status,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        Expanded(
          flex: 2,
          child: Column(
            children: [
              LinearProgressIndicator(
                value: health,
                backgroundColor: Colors.grey.shade300,
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
              const SizedBox(height: 4),
              Text(
                '${(health * 100).toStringAsFixed(1)}%',
                style: const TextStyle(fontSize: 12),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActivityItem(
    BuildContext context,
    String title,
    String description,
    IconData icon,
    Color color,
    String time,
  ) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: color.withOpacity(0.1),
        child: Icon(
          icon,
          color: color,
          size: 20,
        ),
      ),
      title: Text(title),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(description),
          const SizedBox(height: 4),
          Text(
            time,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Colors.grey,
            ),
          ),
        ],
      ),
      isThreeLine: true,
    );
  }

  Widget _buildBottomNavigation(BuildContext context, List<String> features) {
    return BottomNavigationBar(
      type: BottomNavigationBarType.fixed,
      selectedItemColor: Colors.red.shade700,
      unselectedItemColor: Colors.grey,
      currentIndex: 0,
      items: [
        const BottomNavigationBarItem(
          icon: Icon(Icons.dashboard),
          label: 'Dashboard',
        ),
        if (features.contains('user_management'))
          const BottomNavigationBarItem(
            icon: Icon(Icons.people),
            label: 'Users',
          ),
        if (features.contains('monitoring'))
          const BottomNavigationBarItem(
            icon: Icon(Icons.analytics),
            label: 'Monitoring',
          ),
        const BottomNavigationBarItem(
          icon: Icon(Icons.security),
          label: 'Security',
        ),
        if (features.contains('system_admin'))
          const BottomNavigationBarItem(
            icon: Icon(Icons.admin_panel_settings),
            label: 'System',
          ),
      ],
      onTap: (index) {
        // Handle navigation
      },
    );
  }

  void _showFeatureDialog(BuildContext context, String feature) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(feature),
        content: Text('$feature feature will be implemented here.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}