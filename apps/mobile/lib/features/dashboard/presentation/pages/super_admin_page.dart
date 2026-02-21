import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/di/dependency_injection.dart';
import '../../../../core/services/role_service.dart';
import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../data/models/super_admin_dashboard_models.dart';
import '../../data/repositories/super_admin_dashboard_repository.dart';
import '../../../../shared/widgets/logout_menu_widget.dart';
import '../../../../shared/widgets/auth_listener_wrapper.dart';

class SuperAdminPage extends StatefulWidget {
  const SuperAdminPage({super.key});

  @override
  State<SuperAdminPage> createState() => _SuperAdminPageState();
}

class _SuperAdminPageState extends State<SuperAdminPage> {
  final SuperAdminDashboardRepository _repository =
      sl<SuperAdminDashboardRepository>();

  SuperAdminDashboardModel? _dashboard;
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
              title: 'Super Admin Dashboard',
            );
          }
          return _buildDashboard(context, state);
        },
      ),
    );
  }

  Widget _buildDashboard(BuildContext context, AuthAuthenticated authState) {
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
            onPressed: () => _showFeatureDialog(context, 'Security Settings'),
            tooltip: 'Security Settings',
          ),
          IconButton(
            icon: const Icon(Icons.notifications),
            onPressed: () => _showFeatureDialog(context, 'Notifications'),
            tooltip: 'Notifications',
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
                    'Failed to load Super Admin dashboard',
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
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome, ${dashboard.userName.isEmpty ? 'Super Administrator' : dashboard.userName}',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Global System Administration & Multi-Company Oversight',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
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
                dashboard.tenantOverview.totalCompanies.toString(),
                Icons.corporate_fare,
                Colors.blue,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard(
                context,
                'Total Estates',
                dashboard.platformStats.totalEstates.toString(),
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
                dashboard.tenantOverview.totalUsers.toString(),
                Icons.people,
                Colors.orange,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard(
                context,
                'System Uptime',
                '${dashboard.systemOverview.apiUptime.toStringAsFixed(2)}%',
                Icons.schedule,
                Colors.green.shade700,
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
                  'API Server',
                  dashboard.systemOverview.status,
                  _statusColor(dashboard.systemOverview.status),
                  (dashboard.systemOverview.apiUptime / 100).clamp(0.0, 1.0),
                ),
                const Divider(height: 24),
                _buildHealthItem(
                  'Database',
                  dashboard.systemOverview.databaseStatus,
                  _statusColor(dashboard.systemOverview.databaseStatus),
                  _statusScore(dashboard.systemOverview.databaseStatus),
                ),
                const Divider(height: 24),
                _buildHealthItem(
                  'Redis Cache',
                  dashboard.systemOverview.redisStatus,
                  _statusColor(dashboard.systemOverview.redisStatus),
                  _statusScore(dashboard.systemOverview.redisStatus),
                ),
                const Divider(height: 24),
                _buildHealthItem(
                  'Queue',
                  dashboard.systemOverview.queueStatus,
                  _statusColor(dashboard.systemOverview.queueStatus),
                  _statusScore(dashboard.systemOverview.queueStatus),
                ),
                const Divider(height: 24),
                _buildHealthItem(
                  'Storage',
                  dashboard.systemOverview.storageStatus,
                  _statusColor(dashboard.systemOverview.storageStatus),
                  _statusScore(dashboard.systemOverview.storageStatus),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'System Alerts',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Card(
          child: dashboard.systemAlerts.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('No active alerts'),
                )
              : Column(
                  children: dashboard.systemAlerts
                      .take(5)
                      .map((alert) => _buildAlertItem(context, alert))
                      .toList(),
                ),
        ),
        const SizedBox(height: 24),
        Text(
          'Recent System Activities',
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
          'System Privileges',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
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
                  children: permissions
                      .map(
                        (permission) => Chip(
                          label: Text(
                            permission.replaceAll('_', ' ').toUpperCase(),
                            style: const TextStyle(fontSize: 10),
                          ),
                          backgroundColor: Colors.red.shade100,
                          labelStyle: TextStyle(color: Colors.red.shade700),
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

  Widget _buildHealthItem(
    String service,
    String status,
    Color color,
    double health,
  ) {
    return Row(
      children: [
        Expanded(flex: 2, child: Text(service)),
        Expanded(
          child: Text(
            status.toUpperCase(),
            style: TextStyle(color: color, fontWeight: FontWeight.bold),
          ),
        ),
        Expanded(
          flex: 2,
          child: Column(
            children: [
              LinearProgressIndicator(
                value: health.clamp(0.0, 1.0),
                backgroundColor: Colors.grey.shade300,
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
              const SizedBox(height: 4),
              Text(
                '${(health.clamp(0.0, 1.0) * 100).toStringAsFixed(1)}%',
                style: const TextStyle(fontSize: 12),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAlertItem(BuildContext context, SuperAdminSystemAlert alert) {
    final color = _severityColor(alert.severity);
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: color.withValues(alpha: 0.1),
        child: Icon(Icons.warning_amber_rounded, color: color, size: 20),
      ),
      title: Text(alert.title),
      subtitle: Text(
        '${alert.message}\n${_formatRelativeTime(alert.createdAt)}',
      ),
      isThreeLine: true,
    );
  }

  Widget _buildActivityItem(
    BuildContext context,
    SuperAdminActivity activity,
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
        '${activity.description}\n${activity.actor}${activity.companyName.isNotEmpty ? ' • ${activity.companyName}' : ''} • ${_formatRelativeTime(activity.timestamp)}',
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
      case 'COMPANY_CREATED':
      case 'COMPANY_UPDATED':
        return Icons.corporate_fare;
      case 'SECURITY_EVENT':
        return Icons.security;
      case 'SYSTEM_SETTINGS_CHANGED':
        return Icons.settings;
      case 'BACKUP_CREATED':
        return Icons.backup;
      default:
        return Icons.history;
    }
  }

  Color _severityColor(String severity) {
    switch (severity) {
      case 'CRITICAL':
        return Colors.red;
      case 'WARNING':
        return Colors.orange;
      default:
        return Colors.blueGrey;
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'HEALTHY':
      case 'ONLINE':
        return Colors.green;
      case 'DEGRADED':
      case 'PARTIAL':
      case 'WARNING':
        return Colors.orange;
      case 'CRITICAL':
      case 'OFFLINE':
        return Colors.red;
      default:
        return Colors.blueGrey;
    }
  }

  double _statusScore(String status) {
    switch (status) {
      case 'HEALTHY':
      case 'ONLINE':
        return 0.98;
      case 'DEGRADED':
      case 'PARTIAL':
      case 'WARNING':
        return 0.65;
      case 'CRITICAL':
      case 'OFFLINE':
        return 0.20;
      default:
        return 0.40;
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
