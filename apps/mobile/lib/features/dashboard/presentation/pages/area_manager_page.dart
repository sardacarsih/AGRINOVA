import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/di/dependency_injection.dart';
import '../../../../core/services/role_service.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/theme/runtime_theme_slot_resolver.dart';
import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../../shared/widgets/auth_listener_wrapper.dart';
import '../blocs/area_manager_dashboard_bloc.dart';

// Area Manager Dashboard Components
import 'area_manager_dashboard/area_manager_theme.dart';
import 'area_manager_dashboard/organisms/area_manager_welcome_section.dart';
import 'area_manager_dashboard/organisms/area_manager_actions_grid.dart';
import 'area_manager_dashboard/organisms/area_manager_map_section.dart';
import 'area_manager_dashboard/organisms/area_manager_stats_section.dart';
import 'area_manager_dashboard/organisms/area_manager_performance_section.dart';
import 'area_manager_dashboard/organisms/area_manager_capabilities_section.dart';
import 'area_manager_dashboard/organisms/area_manager_monitor_tab.dart';
import 'area_manager_dashboard/organisms/area_manager_managers_tab.dart';

/// Enhanced Area Manager Page using Atomic Design Pattern
///
/// Features:
/// - Welcome section with data access scope
/// - Quick actions grid (2x2)
/// - Interactive map with estate markers
/// - Estate statistics cards (real data via AreaManagerDashboardBloc)
/// - Performance ranking bars (real data via AreaManagerDashboardBloc)
/// - Capabilities section
class AreaManagerPage extends StatefulWidget {
  const AreaManagerPage({super.key});

  @override
  State<AreaManagerPage> createState() => _AreaManagerPageState();
}

class _AreaManagerPageState extends State<AreaManagerPage> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return BlocProvider<AreaManagerDashboardBloc>(
      create: (_) =>
          sl<AreaManagerDashboardBloc>()
            ..add(const AreaManagerDashboardLoadRequested()),
      child: AuthListenerWrapper(
        child: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            if (state is AuthAuthenticated) {
              return _buildDashboard(context, state);
            }
            return _buildLoadingScreen();
          },
        ),
      ),
    );
  }

  Widget _buildDashboard(BuildContext context, AuthAuthenticated state) {
    const role = 'area_manager';
    final features = RoleService.getDashboardFeatures(role);
    final permissions = RoleService.getRolePermissions(role);
    final dataScope = RoleService.getDataAccessScope(role);

    return Scaffold(
      backgroundColor: RuntimeThemeSlotResolver.dashboardBackground(
        context,
        fallback: AreaManagerTheme.scaffoldBackground,
      ),
      appBar: _buildAppBar(context, state),
      body: _buildBody(context, state, dataScope, features, permissions),
      bottomNavigationBar: _buildBottomNavigation(context),
    );
  }

  PreferredSizeWidget _buildAppBar(
    BuildContext context,
    AuthAuthenticated state,
  ) {
    final navbarBg = RuntimeThemeSlotResolver.navbarBackground(
      context,
      fallback: AreaManagerTheme.primaryTeal,
    );
    final navbarFg = RuntimeThemeSlotResolver.navbarForeground(
      context,
      fallback: Colors.white,
    );
    final navbarIcon = RuntimeThemeSlotResolver.navbarIcon(
      context,
      fallback: Colors.white,
    );

    return AppBar(
      elevation: 0,
      backgroundColor: navbarBg,
      foregroundColor: navbarFg,
      leading: IconButton(
        icon: Icon(Icons.notifications_outlined, color: navbarIcon),
        onPressed: () => _showNotifications(context),
      ),
      title: Text(
        'Area Manager',
        style: TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 20,
          color: navbarFg,
        ),
      ),
      centerTitle: true,
      actions: [
        IconButton(
          icon: Icon(Icons.bar_chart, color: navbarIcon),
          onPressed: () => _showComingSoon(context, 'Analytics'),
        ),
        IconButton(
          icon: Icon(Icons.more_vert, color: navbarIcon),
          onPressed: () => _showMenu(context, state),
        ),
      ],
    );
  }

  Widget _buildBody(
    BuildContext context,
    AuthAuthenticated state,
    String dataScope,
    List<String> features,
    List<String> permissions,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Welcome Section
          AreaManagerWelcomeSection(
            userName: state.user.fullName,
            dataScope: dataScope.toUpperCase(),
          ),

          const SizedBox(height: 20),

          // Quick Actions Grid
          AreaManagerActionsGrid(
            onMonitoring: () => _navigateToMonitor(context),
            onReporting: () => _showComingSoon(context, 'Estate Reporting'),
            onManagerReports: () => _showComingSoon(context, 'Manager Reports'),
            onOversight: () =>
                _showComingSoon(context, 'Cross-Estate Oversight'),
          ),

          const SizedBox(height: 24),

          // Map Section with real interactive map
          const AreaManagerMapSection(),

          const SizedBox(height: 24),

          // Estate Statistics — driven by real BLoC data
          BlocBuilder<AreaManagerDashboardBloc, AreaManagerDashboardState>(
            builder: (context, dashState) {
              if (dashState is AreaManagerDashboardLoaded) {
                return AreaManagerStatsSection(
                  totalEstates: dashState.stats.totalEstates,
                  activeManagers: dashState.managers.length,
                  pendingApprovals: dashState.alerts.length,
                  todayHarvest:
                      '${dashState.stats.todayProduction.toStringAsFixed(0)} ton',
                );
              }
              // Show defaults while loading or on error
              return const AreaManagerStatsSection();
            },
          ),

          const SizedBox(height: 24),

          // Performance Ranking — driven by real BLoC data
          BlocBuilder<AreaManagerDashboardBloc, AreaManagerDashboardState>(
            builder: (context, dashState) {
              if (dashState is AreaManagerDashboardLoaded &&
                  dashState.companyPerformance.isNotEmpty) {
                final perfs = dashState.companyPerformance
                    .map(
                      (cp) => EstatePerformance(
                        name: cp.companyName,
                        percentage: cp.targetAchievement.clamp(0, 100),
                      ),
                    )
                    .toList();
                return AreaManagerPerformanceSection(performances: perfs);
              }
              // Show default mock until data loads
              return const AreaManagerPerformanceSection();
            },
          ),

          const SizedBox(height: 24),

          // Capabilities Section
          AreaManagerCapabilitiesSection(
            permissions: permissions
                .map((p) => p.replaceAll('_', ' ').toUpperCase())
                .toList(),
            features: features
                .map((f) => f.replaceAll('_', ' ').toUpperCase())
                .toList(),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildBottomNavigation(BuildContext context) {
    final footerBg = RuntimeThemeSlotResolver.footerBackground(
      context,
      fallback: Colors.white,
    );
    final footerSelected = RuntimeThemeSlotResolver.footerSelected(
      context,
      fallback: AreaManagerTheme.primaryTeal,
    );
    final footerUnselected = RuntimeThemeSlotResolver.footerUnselected(
      context,
      fallback: AreaManagerTheme.textMuted,
    );
    final footerBorder = RuntimeThemeSlotResolver.footerBorder(
      context,
      fallback: Colors.transparent,
    );

    return Container(
      decoration: BoxDecoration(
        color: footerBg,
        border: RuntimeThemeSlotResolver.hasFooterBorder
            ? Border(top: BorderSide(color: footerBorder))
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        backgroundColor: footerBg,
        selectedItemColor: footerSelected,
        unselectedItemColor: footerUnselected,
        currentIndex: _currentIndex,
        selectedFontSize: 12,
        unselectedFontSize: 12,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.remove_red_eye_outlined),
            activeIcon: Icon(Icons.remove_red_eye),
            label: 'Monitoring',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.description_outlined),
            activeIcon: Icon(Icons.description),
            label: 'Reports',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Managers',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings_outlined),
            activeIcon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
        onTap: (index) => _handleBottomNavigation(context, index),
      ),
    );
  }

  Widget _buildLoadingScreen() {
    return Scaffold(
      backgroundColor: AreaManagerTheme.scaffoldBackground,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(
                AreaManagerTheme.primaryTeal,
              ),
            ),
            const SizedBox(height: 16),
            Text('Loading dashboard...', style: AreaManagerTheme.bodyMedium),
          ],
        ),
      ),
    );
  }

  void _handleBottomNavigation(BuildContext context, int index) {
    if (index == _currentIndex) return;

    setState(() {
      _currentIndex = index;
    });

    switch (index) {
      case 0:
        // Already on Dashboard
        break;
      case 1:
        _navigateToMonitor(context);
        break;
      case 2:
        // Reports - Coming soon
        _showComingSoon(context, 'Reports');
        break;
      case 3:
        _navigateToManagers(context);
        break;
      case 4:
        // Settings - Coming soon
        _showComingSoon(context, 'Settings');
        break;
    }
  }

  /// Navigate to monitor tab, passing existing BLoC via BlocProvider.value
  void _navigateToMonitor(BuildContext context) {
    final bloc = context.read<AreaManagerDashboardBloc>();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => BlocProvider<AreaManagerDashboardBloc>.value(
          value: bloc,
          child: const AreaManagerMonitorTab(),
        ),
      ),
    );
  }

  /// Navigate to managers tab, passing existing BLoC via BlocProvider.value
  void _navigateToManagers(BuildContext context) {
    final bloc = context.read<AreaManagerDashboardBloc>();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => BlocProvider<AreaManagerDashboardBloc>.value(
          value: bloc,
          child: const AreaManagerManagersTab(),
        ),
      ),
    );
  }

  void _showNotifications(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Notifications coming soon',
          style: TextStyle(
            color: RuntimeThemeSlotResolver.notificationBannerText(
              context,
              fallback: Colors.white,
            ),
          ),
        ),
        backgroundColor: RuntimeThemeSlotResolver.notificationBannerBackground(
          context,
          fallback: AreaManagerTheme.primaryTeal,
        ),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _showMenu(BuildContext context, AuthAuthenticated state) {
    final modalBg = RuntimeThemeSlotResolver.modalBackground(
      context,
      fallback: Colors.white,
    );
    final modalAccent = RuntimeThemeSlotResolver.modalAccent(
      context,
      fallback: AreaManagerTheme.primaryTeal,
    );
    final sidebarIcon = RuntimeThemeSlotResolver.sidebarIcon(
      context,
      fallback: AreaManagerTheme.textPrimary,
    );
    final sidebarText = RuntimeThemeSlotResolver.sidebarForeground(
      context,
      fallback: AreaManagerTheme.textPrimary,
    );

    showModalBottomSheet(
      context: context,
      backgroundColor: modalBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        color: modalBg,
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            ListTile(
              leading: CircleAvatar(
                backgroundColor: modalAccent,
                child: Text(
                  _resolveUserInitial(state),
                  style: const TextStyle(color: Colors.white),
                ),
              ),
              title: Text(
                state.user.fullName,
                style: TextStyle(color: sidebarText),
              ),
              subtitle: Text(
                RoleService.getRoleDisplayName(state.user.role),
                style: TextStyle(color: sidebarText.withValues(alpha: 0.7)),
              ),
            ),
            const Divider(),
            ListTile(
              leading: Icon(Icons.person_outline, color: sidebarIcon),
              title: Text('Profile', style: TextStyle(color: sidebarText)),
              onTap: () {
                Navigator.pop(context);
                _showComingSoon(context, 'Profile');
              },
            ),
            ListTile(
              leading: Icon(Icons.qr_code_scanner_outlined, color: sidebarIcon),
              title: Text('QR Login Web', style: TextStyle(color: sidebarText)),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, AppRoutes.webQRLogin);
              },
            ),
            ListTile(
              leading: Icon(Icons.logout, color: Colors.red[400]),
              title: Text('Logout', style: TextStyle(color: Colors.red[400])),
              onTap: () {
                Navigator.pop(context);
                context.read<AuthBloc>().add(const AuthLogoutRequested());
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showComingSoon(BuildContext context, String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '$feature coming soon',
          style: TextStyle(
            color: RuntimeThemeSlotResolver.notificationBannerText(
              context,
              fallback: Colors.white,
            ),
          ),
        ),
        backgroundColor: RuntimeThemeSlotResolver.notificationBannerBackground(
          context,
          fallback: AreaManagerTheme.primaryTeal,
        ),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  String _resolveUserInitial(AuthAuthenticated state) {
    final username = state.user.username.trim();
    if (username.isNotEmpty) {
      return username.substring(0, 1).toUpperCase();
    }

    final fullName = state.user.fullName.trim();
    if (fullName.isNotEmpty) {
      return fullName.substring(0, 1).toUpperCase();
    }

    return '?';
  }
}
