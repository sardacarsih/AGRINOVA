import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/di/dependency_injection.dart';
import '../../../../core/services/role_service.dart';
import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../data/models/company_admin_dashboard_models.dart';
import '../../data/repositories/company_admin_dashboard_repository.dart';
import '../../../../shared/widgets/logout_menu_widget.dart';
import '../../../../shared/widgets/auth_listener_wrapper.dart';

class CompanyAdminPage extends StatefulWidget {
  const CompanyAdminPage({super.key});

  @override
  State<CompanyAdminPage> createState() => _CompanyAdminPageState();
}

class _CompanyAdminPageState extends State<CompanyAdminPage> {
  final CompanyAdminDashboardRepository _repository =
      sl<CompanyAdminDashboardRepository>();

  CompanyAdminDashboardModel? _dashboard;
  String? _errorMessage;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    if (mounted) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final dashboard = await _repository.getDashboard();
      if (!mounted) return;
      setState(() {
        _dashboard = dashboard;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthListenerWrapper(
      child: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          if (state is! AuthAuthenticated) {
            return const _DashboardLoadingScaffold(
              title: 'Company Admin Dashboard',
            );
          }
          return _buildDashboard(context, state);
        },
      ),
    );
  }

  Widget _buildDashboard(BuildContext context, AuthAuthenticated authState) {
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
            onPressed: () => _showFeatureDialog(context, 'Notifications'),
            tooltip: 'Notifications',
          ),
          IconButton(
            icon: const Icon(Icons.admin_panel_settings),
            onPressed: () => _showFeatureDialog(context, 'Admin Settings'),
            tooltip: 'Admin Settings',
          ),
          LogoutMenuWidget(
            username: authState.user.username,
            role: RoleService.getRoleDisplayName(authState.user.role),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDashboard,
        child: _buildBody(context, dataScope, features, permissions),
      ),
      bottomNavigationBar: _buildBottomNavigation(context, features),
    );
  }

  Widget _buildBody(
    BuildContext context,
    String dataScope,
    List<String> features,
    List<String> permissions,
  ) {
    if (_isLoading) {
      return ListView(
        physics: AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: 240),
          Center(child: CircularProgressIndicator()),
          SizedBox(height: 16),
          Center(child: Text('Loading dashboard...')),
        ],
      );
    }

    if (_errorMessage != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const Icon(Icons.error_outline, color: Colors.red, size: 40),
                  const SizedBox(height: 12),
                  const Text(
                    'Failed to load Company Admin dashboard',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _errorMessage ?? 'Unknown error',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.black54),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _loadDashboard,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    }

    final dashboard = _dashboard;
    if (dashboard == null) {
      return ListView(
        physics: AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: 260),
          Center(child: Text('No dashboard data available')),
        ],
      );
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome, ${dashboard.userName.isEmpty ? 'Company Administrator' : dashboard.userName}',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  dashboard.companyName.isNotEmpty
                      ? '${dashboard.companyName} (${dashboard.companyCode})'
                      : 'Company-Wide Management & System Configuration',
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
                dashboard.stats.totalEstates.toString(),
                Icons.business,
                Colors.blue,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard(
                context,
                'Total Users',
                dashboard.stats.totalUsers.toString(),
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
                dashboard.stats.totalDivisions.toString(),
                Icons.account_tree,
                Colors.orange,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard(
                context,
                'Monthly Production',
                '${dashboard.stats.monthlyProduction.toStringAsFixed(1)} ton',
                Icons.agriculture,
                Colors.green.shade800,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Text(
          'System Health',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _buildHealthItem(
                  'API',
                  dashboard.systemHealth.apiHealth ? 'ONLINE' : 'OFFLINE',
                  dashboard.systemHealth.apiHealth ? Colors.green : Colors.red,
                ),
                const Divider(height: 20),
                _buildHealthItem(
                  'Database',
                  dashboard.systemHealth.databaseHealth ? 'ONLINE' : 'OFFLINE',
                  dashboard.systemHealth.databaseHealth
                      ? Colors.green
                      : Colors.red,
                ),
                const Divider(height: 20),
                _buildHealthItem(
                  'Sync Service',
                  dashboard.systemHealth.syncServiceHealth
                      ? 'ONLINE'
                      : 'OFFLINE',
                  dashboard.systemHealth.syncServiceHealth
                      ? Colors.green
                      : Colors.red,
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Pending sync operations'),
                    Text(
                      dashboard.systemHealth.pendingSyncOperations.toString(),
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Estate Overview',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Card(
          child: dashboard.estateOverview.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('No estate data available'),
                )
              : Column(
                  children: dashboard.estateOverview
                      .take(5)
                      .map((estate) => _buildEstateItem(context, estate))
                      .toList(),
                ),
        ),
        const SizedBox(height: 24),
        Text(
          'Recent Activities',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Card(
          child: dashboard.recentActivities.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('No recent activities'),
                )
              : Column(
                  children: dashboard.recentActivities
                      .take(6)
                      .map((activity) => _buildActivityItem(context, activity))
                      .toList(),
                ),
        ),
        const SizedBox(height: 24),
        Text(
          'Your Capabilities',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
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
                  children: permissions
                      .map(
                        (permission) => Chip(
                          label: Text(
                            permission.replaceAll('_', ' ').toUpperCase(),
                            style: const TextStyle(fontSize: 10),
                          ),
                          backgroundColor:
                              Theme.of(context).primaryColor.withValues(
                                    alpha: 0.1,
                                  ),
                        ),
                      )
                      .toList(),
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
                  children: features
                      .map(
                        (feature) => Chip(
                          label: Text(
                            feature.replaceAll('_', ' ').toUpperCase(),
                            style: const TextStyle(fontSize: 10),
                          ),
                          backgroundColor: Theme.of(context)
                              .colorScheme
                              .secondary
                              .withValues(
                                alpha: 0.1,
                              ),
                        ),
                      )
                      .toList(),
                ),
              ],
            ),
          ),
        ),
      ],
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
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 32, color: color),
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
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: Theme.of(context).textTheme.bodySmall),
                Icon(icon, color: color, size: 20),
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

  Widget _buildHealthItem(String service, String status, Color color) {
    return Row(
      children: [
        Expanded(flex: 2, child: Text(service)),
        Expanded(
          child: Text(
            status,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEstateItem(
    BuildContext context,
    CompanyAdminEstateOverview estate,
  ) {
    final statusColor = _estateStatusColor(estate.status);
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: statusColor.withValues(alpha: 0.1),
        child: Icon(Icons.business, color: statusColor, size: 20),
      ),
      title: Text(estate.estateName),
      subtitle: Text(
        '${estate.divisionsCount} divisions • ${estate.usersCount} users • ${estate.todayProduction.toStringAsFixed(1)} ton',
      ),
      trailing: Text(
        estate.status,
        style: TextStyle(
          color: statusColor,
          fontWeight: FontWeight.bold,
          fontSize: 11,
        ),
      ),
    );
  }

  Widget _buildActivityItem(
    BuildContext context,
    CompanyAdminActivity activity,
  ) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: Colors.blue.withValues(alpha: 0.1),
        child: Icon(
          _activityIcon(activity.type),
          color: Colors.blue,
          size: 20,
        ),
      ),
      title: Text(activity.type.replaceAll('_', ' ')),
      subtitle: Text(
        '${activity.description}\n${activity.actorName} • ${_formatRelativeTime(activity.timestamp)}',
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
      onTap: (index) {},
    );
  }

  void _showFeatureDialog(BuildContext context, String feature) {
    showDialog<void>(
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

  IconData _activityIcon(String type) {
    switch (type) {
      case 'USER_CREATED':
      case 'USER_UPDATED':
      case 'ROLE_CHANGED':
        return Icons.person;
      case 'ESTATE_CREATED':
      case 'DIVISION_CREATED':
        return Icons.business;
      case 'SETTINGS_CHANGED':
        return Icons.settings;
      default:
        return Icons.history;
    }
  }

  Color _estateStatusColor(String status) {
    switch (status) {
      case 'OPERATIONAL':
        return Colors.green;
      case 'PARTIAL':
      case 'MAINTENANCE':
        return Colors.orange;
      case 'OFFLINE':
        return Colors.red;
      default:
        return Colors.blueGrey;
    }
  }

  String _formatRelativeTime(DateTime time) {
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inHours < 1) return '${diff.inMinutes} minutes ago';
    if (diff.inDays < 1) return '${diff.inHours} hours ago';
    return '${diff.inDays} days ago';
  }
}

class _DashboardLoadingScaffold extends StatelessWidget {
  final String title;

  const _DashboardLoadingScaffold({required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: const Center(
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
  }
}
