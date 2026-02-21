import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../../shared/widgets/auth_listener_wrapper.dart';
import '../../../../core/di/dependency_injection.dart';
import '../../../../core/services/notification_storage_service.dart';
import '../../../../core/routes/app_routes.dart';
import '../blocs/manager_dashboard_bloc.dart';

// Import modular components
import 'manager_dashboard/manager_theme.dart';
import 'manager_dashboard/organisms/manager_welcome_section.dart';
import 'manager_dashboard/organisms/manager_performance_grid.dart';
import 'manager_dashboard/organisms/manager_actions_grid.dart';
import 'manager_dashboard/organisms/manager_team_section.dart';
import 'manager_dashboard/organisms/manager_reports_section.dart';
import 'manager_dashboard/organisms/manager_profile_tab.dart';
import 'manager_dashboard/organisms/manager_analytics_tab.dart';
import 'manager_dashboard/organisms/manager_monitor_tab.dart';
import 'manager_dashboard/organisms/manager_approval_page.dart';
import 'manager_dashboard/organisms/manager_notification_page.dart';
import 'manager_dashboard/atoms/manager_icon_badge.dart';

/// Enhanced Manager Page using Atomic Design Pattern
///
/// Features:
/// - Modular components (atoms, molecules, organisms)
/// - Consistent purple theme via ManagerTheme
/// - Light mode design with purple accents
class ManagerPage extends StatefulWidget {
  const ManagerPage({super.key});

  @override
  State<ManagerPage> createState() => _ManagerPageState();
}

class _ManagerPageState extends State<ManagerPage> {
  static final Logger _logger = Logger();
  final NotificationStorageService _notificationStorage =
      sl<NotificationStorageService>();
  int _unreadNotificationCount = 0;
  StreamSubscription<int>? _unreadCountSubscription;

  @override
  void initState() {
    super.initState();
    _loadUnreadCount();
    _unreadCountSubscription =
        NotificationStorageService.unreadCountStream.listen((count) {
      if (mounted) {
        setState(() => _unreadNotificationCount = count);
      }
    });
  }

  Future<void> _loadUnreadCount() async {
    try {
      await _notificationStorage.initialize();
      final count = await _notificationStorage.getUnreadCount();
      if (mounted) {
        setState(() => _unreadNotificationCount = count);
      }
    } catch (e) {
      _logger.w('Failed to load manager unread notifications: $e');
    }
  }

  @override
  void dispose() {
    _unreadCountSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider<ManagerDashboardBloc>(
      create: (_) => sl<ManagerDashboardBloc>()
        ..add(const ManagerDashboardLoadRequested()),
      child: AuthListenerWrapper(
        child: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            if (state is AuthAuthenticated) {
              _logger.i(
                  'Loading Manager dashboard for user: ${state.user.username}');
              return _buildDashboard(context, state);
            }
            return _buildLoadingScreen();
          },
        ),
      ),
    );
  }

  Widget _buildDashboard(BuildContext context, AuthAuthenticated state) {
    return Scaffold(
      backgroundColor: ManagerTheme.scaffoldBackground,
      appBar: _buildAppBar(context, state),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ManagerTheme.paddingMedium),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome Section
            BlocBuilder<ManagerDashboardBloc, ManagerDashboardState>(
              builder: (context, dashState) {
                final stats = dashState is ManagerDashboardLoaded
                    ? dashState.dashboard.stats
                    : null;
                return ManagerWelcomeSection(
                  state: state,
                  stats: stats,
                );
              },
            ),
            const SizedBox(height: ManagerTheme.sectionSpacing),

            // Performance Grid - "Performa Estate"
            BlocBuilder<ManagerDashboardBloc, ManagerDashboardState>(
              builder: (context, dashState) {
                final stats = dashState is ManagerDashboardLoaded
                    ? dashState.dashboard.stats
                    : null;
                final analytics = dashState is ManagerDashboardLoaded
                    ? dashState.analytics
                    : null;
                return ManagerPerformanceGrid(
                  onMetricTap: () => _navigateToAnalytics(context),
                  stats: stats,
                  analytics: analytics,
                );
              },
            ),
            const SizedBox(height: ManagerTheme.sectionSpacing),

            // Quick Actions - "Aksi Manajemen"
            ManagerActionsGrid(
              onMonitoring: () => _navigateToMonitoring(context),
              onTeamReview: () => _navigateToTeamReview(context),
              onReports: () => _navigateToReports(context),
              onPlanning: () => _navigateToPlanning(context),
              onAnalytics: () => _navigateToAnalytics(context),
              onSettings: () => _navigateToSettings(context),
            ),
            const SizedBox(height: ManagerTheme.sectionSpacing),

            // Team Section - "Performa Tim"
            BlocBuilder<ManagerDashboardBloc, ManagerDashboardState>(
              builder: (context, dashState) {
                final topPerformers = dashState is ManagerDashboardLoaded
                    ? dashState.dashboard.teamSummary.topPerformers
                    : null;
                return ManagerTeamSection(
                  onViewAll: () => _navigateToTeamReview(context),
                  topPerformers: topPerformers,
                );
              },
            ),
            const SizedBox(height: ManagerTheme.sectionSpacing),

            // Reports Section - "Aktivitas Panen Hari Ini"
            BlocBuilder<ManagerDashboardBloc, ManagerDashboardState>(
              builder: (context, dashState) {
                final highlights = dashState is ManagerDashboardLoaded
                    ? dashState.dashboard.todayHighlights
                    : null;
                return ManagerReportsSection(highlights: highlights);
              },
            ),

            const SizedBox(height: 100), // Bottom padding for nav bar
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNavigation(context),
    );
  }

  PreferredSizeWidget _buildAppBar(
      BuildContext context, AuthAuthenticated state) {
    return AppBar(
      title: const Text(
        'Manager Dashboard',
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ),
      flexibleSpace: Container(
        decoration: const BoxDecoration(
          gradient: ManagerTheme.headerGradient,
        ),
      ),
      backgroundColor: Colors.transparent,
      elevation: 0,
      iconTheme: const IconThemeData(color: Colors.white),
      actions: [
        IconButton(
          icon: ManagerIconBadge(
            icon: Icons.notifications_outlined,
            badgeCount: _unreadNotificationCount,
          ),
          onPressed: () => _showNotifications(context),
          tooltip: 'Notifications',
        ),
        IconButton(
          icon: const Icon(Icons.bar_chart, color: Colors.white),
          onPressed: () => _navigateToAnalytics(context),
          tooltip: 'Analytics',
        ),
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert, color: Colors.white),
          onSelected: (value) {
            if (value == 'profile') {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const ManagerProfileTab(),
                ),
              );
              return;
            }
            if (value == 'web_qr_login') {
              Navigator.pushNamed(context, AppRoutes.webQRLogin);
              return;
            }
            if (value == 'logout') {
              context.read<AuthBloc>().add(AuthLogoutRequested());
            }
          },
          itemBuilder: (context) => [
            PopupMenuItem(
              value: 'profile',
              child: Row(
                children: [
                  Icon(Icons.person_outline, color: ManagerTheme.textSecondary),
                  const SizedBox(width: 12),
                  const Text('Profile'),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'web_qr_login',
              child: Row(
                children: [
                  Icon(Icons.qr_code_scanner_outlined,
                      color: ManagerTheme.textSecondary),
                  const SizedBox(width: 12),
                  const Text('QR Login Web'),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'settings',
              child: Row(
                children: [
                  Icon(Icons.settings_outlined,
                      color: ManagerTheme.textSecondary),
                  const SizedBox(width: 12),
                  const Text('Settings'),
                ],
              ),
            ),
            const PopupMenuDivider(),
            PopupMenuItem(
              value: 'logout',
              child: Row(
                children: [
                  Icon(Icons.logout, color: ManagerTheme.rejectedRed),
                  const SizedBox(width: 12),
                  Text('Logout',
                      style: TextStyle(color: ManagerTheme.rejectedRed)),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildBottomNavigation(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: ManagerTheme.cardBackground,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        backgroundColor: ManagerTheme.cardBackground,
        currentIndex: 0,
        selectedItemColor: ManagerTheme.primaryPurple,
        unselectedItemColor: ManagerTheme.textMuted,
        selectedLabelStyle:
            const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
        unselectedLabelStyle: const TextStyle(fontSize: 12),
        items: const [
          BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard),
              label: 'Dashboard'),
          BottomNavigationBarItem(
              icon: Icon(Icons.monitor_outlined),
              activeIcon: Icon(Icons.monitor),
              label: 'Monitor'),
          BottomNavigationBarItem(
              icon: Icon(Icons.bar_chart_outlined),
              activeIcon: Icon(Icons.bar_chart),
              label: 'Analytics'),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Profile'),
        ],
        onTap: (index) => _handleBottomNavigation(context, index),
      ),
    );
  }

  Widget _buildLoadingScreen() {
    return Scaffold(
      backgroundColor: ManagerTheme.scaffoldBackground,
      appBar: AppBar(
        title: const Text('Manager Dashboard'),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: ManagerTheme.headerGradient,
          ),
        ),
        backgroundColor: Colors.transparent,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(
              valueColor:
                  AlwaysStoppedAnimation<Color>(ManagerTheme.primaryPurple),
            ),
            const SizedBox(height: 16),
            Text('Memuat dashboard...', style: ManagerTheme.bodyMedium),
          ],
        ),
      ),
    );
  }

  // Navigation Methods
  void _handleBottomNavigation(BuildContext context, int index) {
    switch (index) {
      case 0:
        break; // Already on dashboard
      case 1:
        _navigateToMonitoring(context);
        break;
      case 2:
        _navigateToAnalytics(context);
        break;
      case 3:
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const ManagerProfileTab()),
        );
        break;
    }
  }

  void _navigateToMonitoring(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const ManagerMonitorTab()),
    );
  }

  void _navigateToAnalytics(BuildContext context) {
    final bloc = context.read<ManagerDashboardBloc>();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => BlocProvider<ManagerDashboardBloc>.value(
          value: bloc,
          child: const ManagerAnalyticsTab(),
        ),
      ),
    );
  }

  void _navigateToTeamReview(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const ManagerApprovalPage()),
    );
  }

  void _navigateToReports(BuildContext context) {
    _showComingSoon(context, 'Reports');
  }

  void _navigateToPlanning(BuildContext context) {
    _showComingSoon(context, 'Planning');
  }

  void _navigateToSettings(BuildContext context) {
    _showComingSoon(context, 'Settings');
  }

  void _showNotifications(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const ManagerNotificationPage()),
    ).then((_) => _loadUnreadCount());
  }

  void _showComingSoon(BuildContext context, String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature dalam pengembangan'),
        backgroundColor: ManagerTheme.pendingOrange,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
