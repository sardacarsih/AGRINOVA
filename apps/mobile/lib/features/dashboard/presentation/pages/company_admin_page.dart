import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/services/role_service.dart';
import '../../../../core/config/app_config.dart';
import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../../shared/widgets/logout_menu_widget.dart';
import '../../../../shared/widgets/auth_listener_wrapper.dart';

class CompanyAdminPage extends StatelessWidget {
  const CompanyAdminPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AuthListenerWrapper(
      child: BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is AuthAuthenticated) {
          const role = 'company_admin';
          final features = RoleService.getDashboardFeatures(role);
          final permissions = RoleService.getRolePermissions(role);
          final dataScope = RoleService.getDataAccessScope(role);
          
          return Scaffold(
            appBar: AppBar(
              title: Text(RoleService.getRoleDisplayName(role)),
              backgroundColor: Colors.deepOrange[600],
              foregroundColor: Colors.white,
              actions: [
                IconButton(
                  icon: const Icon(Icons.notifications),
                  onPressed: () {
                    // Navigate to notifications
                  },
                  tooltip: 'Notifications',
                ),
                IconButton(
                  icon: const Icon(Icons.admin_panel_settings),
                  onPressed: () {
                    // Navigate to admin settings
                  },
                  tooltip: 'Admin Settings',
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
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welcome, Company Administrator',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Company-Wide Management & System Configuration',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Data Access: ${dataScope.toUpperCase()}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).primaryColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Quick Actions Grid
            Text(
              'Quick Actions',
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
                if (features.contains('user_management'))
                  _buildActionCard(
                    context,
                    'User\nManagement',
                    Icons.people_alt,
                    Colors.blue,
                    () => _showFeatureDialog(context, 'User Management'),
                  ),
                _buildActionCard(
                  context,
                  'Estate\nManagement',
                  Icons.business,
                  Colors.green,
                  () => _showFeatureDialog(context, 'Estate Management'),
                ),
                _buildActionCard(
                  context,
                  'Division\nManagement',
                  Icons.account_tree,
                  Colors.orange,
                  () => _showFeatureDialog(context, 'Division Management'),
                ),
                if (features.contains('system_admin'))
                  _buildActionCard(
                    context,
                    'System\nConfiguration',
                    Icons.settings,
                    Colors.red,
                    () => _showFeatureDialog(context, 'System Configuration'),
                  ),
                if (features.contains('monitoring'))
                  _buildActionCard(
                    context,
                    'Company\nMonitoring',
                    Icons.dashboard,
                    Colors.purple,
                    () => _showFeatureDialog(context, 'Company Monitoring'),
                  ),
                if (features.contains('reporting'))
                  _buildActionCard(
                    context,
                    'Company\nReporting',
                    Icons.analytics,
                    Colors.teal,
                    () => _showFeatureDialog(context, 'Company Reporting'),
                  ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Statistics Cards
            Text(
              'Company Statistics',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    context,
                    'Total Estates',
                    '25',
                    Icons.business,
                    Colors.blue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    context,
                    'Total Users',
                    '387',
                    Icons.people,
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
                    'Active Divisions',
                    '156',
                    Icons.account_tree,
                    Colors.orange,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    context,
                    'Monthly Production',
                    '45,678 ton',
                    Icons.agriculture,
                    Colors.green.shade800,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Recent Activities
            Text(
              'Recent Activities',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Card(
              child: Column(
                children: [
                  _buildActivityItem(
                    context,
                    'New Estate Created',
                    'Estate Tanjung Baru was created by Area Manager John',
                    Icons.business,
                    Colors.green,
                    '2 hours ago',
                  ),
                  const Divider(height: 1),
                  _buildActivityItem(
                    context,
                    'User Role Updated',
                    'Manager Sarah was promoted to Area Manager',
                    Icons.person_add,
                    Colors.blue,
                    '5 hours ago',
                  ),
                  const Divider(height: 1),
                  _buildActivityItem(
                    context,
                    'System Configuration',
                    'Harvest approval workflow updated',
                    Icons.settings,
                    Colors.orange,
                    '1 day ago',
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Permissions & Capabilities
            Text(
              'Your Capabilities',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
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
                          backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Features:',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: features.map((feature) {
                        return Chip(
                          label: Text(
                            feature.replaceAll('_', ' ').toUpperCase(),
                            style: const TextStyle(fontSize: 10),
                          ),
                          backgroundColor: Theme.of(context).colorScheme.secondary.withOpacity(0.1),
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
          appBar: AppBar(title: Text('Company Admin Dashboard')),
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
      selectedItemColor: Theme.of(context).primaryColor,
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
        if (features.contains('reporting'))
          const BottomNavigationBarItem(
            icon: Icon(Icons.assessment),
            label: 'Reports',
          ),
        if (features.contains('system_admin'))
          const BottomNavigationBarItem(
            icon: Icon(Icons.settings),
            label: 'Settings',
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