import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../../core/services/role_service.dart';
import '../../../../core/services/connectivity_service.dart';
import '../../../../core/services/harvest_sync_service.dart';
import '../../../../core/database/enhanced_database_service.dart';
import '../../../../shared/widgets/logout_menu_widget.dart';
import '../../../../core/di/dependency_injection.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/services/fcm_service.dart';

// Import Mandor Dashboard Components
import 'mandor_dashboard/mandor_components.dart';
import 'mandor_dashboard/atoms/mandor_icon_badge.dart';
import 'mandor_dashboard/organisms/mandor_notification_page.dart';
import 'mandor_dashboard/organisms/mandor_sync_page.dart';

// Import BLoCs
import '../blocs/mandor_dashboard_bloc.dart';
import '../../../harvest/presentation/blocs/harvest_bloc.dart';
import '../../../../core/services/notification_storage_service.dart';

/// Mandor Page with Gen Z Modern Design
///
/// Features modular, reusable components using Atomic Design pattern.
/// Uses green-based harvest theme with glassmorphism and neon effects.
/// Connected to real data via MandorDashboardBloc.
class MandorPage extends StatefulWidget {
  const MandorPage({super.key});

  @override
  State<MandorPage> createState() => _MandorPageState();
}

class _MandorPageState extends State<MandorPage> with TickerProviderStateMixin {
  static final Logger _logger = Logger();
  final NotificationStorageService _notificationStorage =
      sl<NotificationStorageService>();
  final ConnectivityService _connectivityService = sl<ConnectivityService>();
  final HarvestSyncService _harvestSyncService = sl<HarvestSyncService>();
  final EnhancedDatabaseService _databaseService =
      sl<EnhancedDatabaseService>();
  late final MandorDashboardBloc _mandorDashboardBloc;
  late final HarvestBloc _harvestBloc;

  int _currentNavIndex = 0;
  int _unreadNotificationCount = 0;
  StreamSubscription<int>? _unreadCountSubscription;
  StreamSubscription<HarvestNotificationEvent>?
      _harvestNotificationSubscription;
  Timer? _harvestNotificationSyncDebounce;
  bool _isAutoSyncingApprovalUpdate = false;
  bool _isNavigatingToLogin = false;
  String? _lastRouteArgsSignature;
  String? _focusHarvestId;
  int _syncRefreshSignal = 0;

  @override
  void initState() {
    super.initState();
    _mandorDashboardBloc = sl<MandorDashboardBloc>()
      ..add(const MandorDashboardLoadRequested());
    _harvestBloc = sl<HarvestBloc>();
    _loadUnreadCount();
    _unreadCountSubscription =
        NotificationStorageService.unreadCountStream.listen((count) {
      if (mounted) {
        setState(() => _unreadNotificationCount = count);
      }
    });
    _harvestNotificationSubscription =
        FCMService.harvestNotificationStream.listen(_handleHarvestNotification);
  }

  Future<void> _loadUnreadCount() async {
    try {
      await _notificationStorage.initialize();
      final count = await _notificationStorage.getUnreadCount();
      if (mounted) {
        setState(() => _unreadNotificationCount = count);
      }
    } catch (e) {
      _logger.w('Failed to load unread count: $e');
    }
  }

  void _applyRouteArgumentsIfNeeded(BuildContext blocContext) {
    final args = ModalRoute.of(blocContext)?.settings.arguments;
    if (args is! Map) {
      return;
    }

    final normalized = args.map(
      (key, value) => MapEntry(key.toString(), value),
    );

    final tab = _toInt(normalized['tab']);
    final panenId = _toNullableString(
      normalized['panenId'] ??
          normalized['panen_id'] ??
          normalized['harvest_id'],
    );
    final action = _toNullableString(normalized['action']);
    final type = _toNullableString(normalized['type']);
    final signature =
        '${tab ?? ''}|${panenId ?? ''}|${action ?? ''}|${type ?? ''}';

    if (signature == _lastRouteArgsSignature) {
      return;
    }

    _lastRouteArgsSignature = signature;
    final targetTab = _normalizeMandorTab(tab, panenId);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }

      final tabChanged = targetTab != null && targetTab != _currentNavIndex;
      final focusChanged = _focusHarvestId != panenId;
      if (tabChanged || focusChanged) {
        setState(() {
          if (targetTab != null) {
            _currentNavIndex = targetTab;
          }
          _focusHarvestId = panenId;
        });
      }

      if (targetTab == 1) {
        _reloadHarvestMasterData(blocContext);
      } else if (targetTab == 2) {
        _refreshHarvestHistory(blocContext);
      }

      if (panenId != null) {
        _showSnackBar('Membuka transaksi panen: $panenId');
      }
    });
  }

  int? _normalizeMandorTab(int? tab, String? panenId) {
    if (tab == null && panenId == null) {
      return null;
    }
    final fallback = panenId != null ? 2 : 0;
    final resolved = tab ?? fallback;
    if (resolved < 0 || resolved > 3) {
      return fallback;
    }
    return resolved;
  }

  int? _toInt(dynamic value) {
    if (value is int) {
      return value;
    }
    if (value is String) {
      return int.tryParse(value);
    }
    return null;
  }

  String? _toNullableString(dynamic value) {
    if (value is String && value.trim().isNotEmpty) {
      return value;
    }
    return null;
  }

  @override
  void dispose() {
    _unreadCountSubscription?.cancel();
    _harvestNotificationSubscription?.cancel();
    _harvestNotificationSyncDebounce?.cancel();
    _mandorDashboardBloc.close();
    _harvestBloc.close();
    super.dispose();
  }

  void _handleHarvestNotification(HarvestNotificationEvent event) {
    if (!mounted) {
      return;
    }

    final authState = context.read<AuthBloc>().state;
    if (authState is! AuthAuthenticated) {
      return;
    }

    if (authState.user.role.toUpperCase() != 'MANDOR') {
      return;
    }

    final action = event.action.toUpperCase();
    final type = event.type.toUpperCase();
    final shouldRefresh = type == 'HARVEST_STATUS_UPDATE' ||
        type == 'HARVEST_PKS_UPDATE' ||
        action == 'APPROVED' ||
        action == 'REJECTED' ||
        action == 'CORRECTION_REQUIRED' ||
        action == 'PKS_RECEIVED' ||
        action == 'PKS_WEIGHED';

    if (!shouldRefresh) {
      return;
    }

    if (_focusHarvestId != event.panenId) {
      setState(() => _focusHarvestId = event.panenId);
    }

    unawaited(() async {
      await _applyNotificationStatusLocally(event, authState.user.id);
      if (!mounted) {
        return;
      }
      _mandorDashboardBloc.add(const MandorDashboardRefreshRequested());
      _refreshHarvestHistoryWithBloc(_harvestBloc);
    }());
    _scheduleAutoSyncApprovalUpdate(event);
  }

  String? _mapActionToLocalStatus(String action) {
    switch (action.toUpperCase()) {
      case 'APPROVED':
        return 'APPROVED';
      case 'REJECTED':
      case 'CORRECTION_REQUIRED':
        return 'REJECTED';
      case 'PKS_RECEIVED':
        return 'PKS_RECEIVED';
      case 'PKS_WEIGHED':
        return 'PKS_WEIGHED';
      default:
        return null;
    }
  }

  Future<void> _applyNotificationStatusLocally(
    HarvestNotificationEvent event,
    String mandorId,
  ) async {
    final resolvedStatus = _mapActionToLocalStatus(event.action);
    if (resolvedStatus == null) {
      return;
    }

    final now = DateTime.now().millisecondsSinceEpoch;
    final updates = <String, dynamic>{
      'status': resolvedStatus,
      'sync_status': 'SYNCED',
      'needs_sync': 0,
      'updated_at': now,
    };
    if (resolvedStatus == 'APPROVED' ||
        resolvedStatus == 'PKS_RECEIVED' ||
        resolvedStatus == 'PKS_WEIGHED') {
      updates['approval_date'] = now;
    }

    try {
      final updated = await _databaseService.update(
        'harvest_records',
        updates,
        where: '(harvest_id = ? OR server_id = ?) AND mandor_id = ?',
        whereArgs: [event.panenId, event.panenId, mandorId],
      );
      if (updated > 0) {
        _logger.i(
          'Local harvest status updated from notification: ${event.panenId} -> $resolvedStatus',
        );
      } else {
        _logger.d(
          'No local harvest matched notification id ${event.panenId} for local status update',
        );
      }
    } catch (e) {
      _logger.w(
        'Failed to apply local notification status for ${event.panenId}: $e',
      );
    }
  }

  void _scheduleAutoSyncApprovalUpdate(HarvestNotificationEvent event) {
    _harvestNotificationSyncDebounce?.cancel();
    _harvestNotificationSyncDebounce = Timer(
      const Duration(milliseconds: 700),
      () {
        unawaited(_autoSyncApprovalUpdate(event));
      },
    );
  }

  Future<void> _autoSyncApprovalUpdate(HarvestNotificationEvent event) async {
    if (!mounted || _isAutoSyncingApprovalUpdate) {
      return;
    }

    final isConnected = _connectivityService.isOnline ||
        await _connectivityService.checkConnection();
    if (!isConnected) {
      _logger.i(
        'Skip auto sync status approval untuk ${event.panenId}: offline',
      );
      return;
    }

    _isAutoSyncingApprovalUpdate = true;
    try {
      _logger.i(
        'Auto sync status approval untuk ${event.panenId} (action=${event.action})',
      );
      await _harvestSyncService.syncNow();
      if (!mounted) {
        return;
      }
      _mandorDashboardBloc.add(const MandorDashboardRefreshRequested());
      _refreshHarvestHistoryWithBloc(_harvestBloc);
    } catch (e) {
      _logger.w('Auto sync status approval gagal: $e');
    } finally {
      _isAutoSyncingApprovalUpdate = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<MandorDashboardBloc>.value(value: _mandorDashboardBloc),
        BlocProvider<HarvestBloc>.value(value: _harvestBloc),
      ],
      child: BlocConsumer<AuthBloc, AuthState>(
        listenWhen: (previous, current) =>
            previous is! AuthUnauthenticated && current is AuthUnauthenticated,
        listener: (context, state) {
          if (state is AuthUnauthenticated) {
            if (_isNavigatingToLogin || !mounted) {
              return;
            }
            _isNavigatingToLogin = true;
            _logger.i('User logged out, navigating to login page');
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (!mounted) {
                return;
              }
              Navigator.of(context, rootNavigator: true)
                  .pushNamedAndRemoveUntil('/login', (route) => false);
            });
          }
        },
        builder: (context, authState) {
          if (authState is AuthAuthenticated) {
            _logger.i(
                'Rendering Mandor Dashboard for: ${authState.user.username}');
            _applyRouteArgumentsIfNeeded(context);
            return _buildScaffold(context, authState);
          }
          // Show loading for AuthLoading or initial states
          return _buildLoadingScreen();
        },
      ),
    );
  }

  Widget _buildScaffold(BuildContext context, AuthAuthenticated authState) {
    return Scaffold(
      backgroundColor: MandorTheme.gray900,
      appBar: _buildAppBar(context, authState),
      body: _buildBody(context, authState),
      floatingActionButton: _buildFAB(),
      bottomNavigationBar: GenZBottomNav.mandor(
        currentIndex: _currentNavIndex,
        onTap: (index) => _handleBottomNavigation(context, index),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(
    BuildContext blocContext,
    AuthAuthenticated state,
  ) {
    return AppBar(
      title: Text(
        _getCurrentAppBarTitle(),
        style: TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 18,
        ),
      ),
      backgroundColor: MandorTheme.darkGreen,
      foregroundColor: Colors.white,
      elevation: 0,
      actions: [
        // Notification Button
        IconButton(
          icon: MandorIconBadge(
            icon: Icons.notifications_outlined,
            badgeCount: _unreadNotificationCount,
          ),
          onPressed: () => _showNotifications(blocContext),
          tooltip: 'Notifikasi',
        ),

        // Offline Indicator
        if (state.isOfflineMode)
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GenZStatusBadge.offline(compact: true),
          ),

        // Logout Menu
        LogoutMenuWidget(
          username: state.user.username,
          role: RoleService.getRoleDisplayName(state.user.role),
          onProfileTap: () => _showProfilePage(blocContext),
        ),
      ],
    );
  }

  Widget _buildBody(BuildContext context, AuthAuthenticated authState) {
    return IndexedStack(
      index: _currentNavIndex,
      children: [
        // Dashboard Tab with real data
        BlocBuilder<MandorDashboardBloc, MandorDashboardState>(
          builder: (context, state) {
            if (state is MandorDashboardLoading) {
              return _buildLoadingContent();
            }

            if (state is MandorDashboardError) {
              return _buildErrorContent(context, state.message);
            }

            if (state is MandorDashboardLoaded) {
              return _buildDashboardContent(context, authState, state);
            }

            return _buildLoadingContent();
          },
        ),

        // Input Panen Tab
        GenZInputPanenTab(
          mandorId: authState.user.id,
          mandorName: authState.user.fullName,
          divisionId: authState.user.assignedDivisions.isNotEmpty
              ? authState.user.assignedDivisions.first
              : '',
          onSubmitSuccess: () {
            // Refresh dashboard after successful input
            context
                .read<MandorDashboardBloc>()
                .add(const MandorDashboardRefreshRequested());
            context.read<HarvestBloc>().add(
                  HarvestSummaryRequested(date: DateTime.now()),
                );
            if (mounted) {
              setState(() {
                _syncRefreshSignal++;
              });
            }
          },
        ),

        // Riwayat Tab
        GenZRiwayatTab(
          mandorId: authState.user.id,
          focusHarvestId: _focusHarvestId,
          autoOpenFocusedHarvest: true,
          onRefresh: () {
            context
                .read<MandorDashboardBloc>()
                .add(const MandorDashboardRefreshRequested());
          },
        ),

        // Sync Tab
        MandorSyncPage(
          showAppBar: false,
          refreshSignal: _syncRefreshSignal,
          onMasterSyncCompleted: () {
            if (!context.mounted) return;
            _reloadHarvestMasterData(context);
            _refreshHarvestHistory(context);
            context
                .read<MandorDashboardBloc>()
                .add(const MandorDashboardRefreshRequested());
          },
        ),
      ],
    );
  }

  Widget _buildDashboardContent(
    BuildContext context,
    AuthAuthenticated authState,
    MandorDashboardLoaded data,
  ) {
    // Convert BLoC data to organism data types
    final pendingItems = data.pendingItems
        .map((p) => PendingItem(
              id: p.id,
              title: p.title,
              subtitle: p.subtitle,
              time: p.time,
            ))
        .toList();

    final activityItems = data.recentActivity
        .map((a) => ActivityItem(
              id: a.id,
              title: a.title,
              subtitle: a.subtitle,
              time: a.time,
              type: _mapActivityType(a.type),
              isSuccess: a.isSuccess,
            ))
        .toList();

    return RefreshIndicator(
      onRefresh: () async {
        context
            .read<MandorDashboardBloc>()
            .add(const MandorDashboardRefreshRequested());
        // Wait for state change
        await Future.delayed(const Duration(milliseconds: 500));
      },
      color: MandorTheme.forestGreen,
      child: GenZDashboardContent(
        userName: authState.user.fullName.isNotEmpty
            ? authState.user.fullName
            : authState.user.username,
        division: authState.user.division ?? 'All Divisions',
        isOffline: authState.isOfflineMode,
        harvestValue: data.harvestDisplayValue,
        pendingValue: data.pendingCount.toString(),
        employeeValue: data.activeEmployees.toString(),
        blockValue: data.workedBlocks.toString(),
        onHarvestInput: () => _navigateTo('/harvest/input'),
        onEmployeeSelect: () => _navigateTo('/employees'),
        onQualityCheck: () => _navigateTo('/quality-check'),
        onHistory: () => _navigateTo('/history'),
        onReports: () => _navigateTo('/reports'),
        onSettings: () => _navigateTo('/settings'),
        onViewAllPending: () => _navigateTo('/pending'),
        onViewAllActivity: () => _navigateTo('/history'),
        pendingItems: pendingItems,
        activityItems: activityItems,
      ),
    );
  }

  String _getCurrentAppBarTitle() {
    switch (_currentNavIndex) {
      case 1:
        return 'Input Panen';
      case 2:
        return 'Riwayat Panen';
      case 3:
        return 'Sinkronisasi Data';
      case 0:
      default:
        return 'Mandor Dashboard';
    }
  }

  ActivityType _mapActivityType(ActivityDataType type) {
    switch (type) {
      case ActivityDataType.harvest:
        return ActivityType.harvest;
      case ActivityDataType.approval:
        return ActivityType.approval;
      case ActivityDataType.sync:
        return ActivityType.sync;
      case ActivityDataType.employee:
        return ActivityType.employee;
      case ActivityDataType.block:
        return ActivityType.block;
    }
  }

  Widget _buildLoadingContent() {
    return Container(
      decoration: BoxDecoration(
        gradient: MandorTheme.darkGradient,
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(
              valueColor:
                  AlwaysStoppedAnimation<Color>(MandorTheme.forestGreen),
            ),
            const SizedBox(height: 16),
            Text(
              'Memuat data dashboard...',
              style: MandorTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorContent(BuildContext context, String message) {
    return Container(
      decoration: BoxDecoration(
        gradient: MandorTheme.darkGradient,
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline_rounded,
                size: 64,
                color: MandorTheme.coralRed.withValues(alpha: 0.7),
              ),
              const SizedBox(height: 16),
              Text(
                'Gagal memuat data',
                style: MandorTheme.headingSmall,
              ),
              const SizedBox(height: 8),
              Text(
                message,
                style: MandorTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  context
                      .read<MandorDashboardBloc>()
                      .add(const MandorDashboardLoadRequested());
                },
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Coba Lagi'),
                style: MandorTheme.primaryButton,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFAB() {
    // FAB removed as per user request
    return const SizedBox.shrink();
  }

  Widget _buildLoadingScreen() {
    return Scaffold(
      backgroundColor: MandorTheme.gray900,
      appBar: AppBar(
        title: const Text('Mandor Dashboard'),
        backgroundColor: MandorTheme.darkGreen,
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(
              valueColor:
                  AlwaysStoppedAnimation<Color>(MandorTheme.forestGreen),
            ),
            const SizedBox(height: 16),
            Text(
              'Memuat dashboard...',
              style: MandorTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  void _showSnackBar(String message,
      {Color? color, bool showProgress = false}) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            if (showProgress) ...[
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
              const SizedBox(width: 12),
            ],
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: color ?? MandorTheme.gray700,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  void _handleBottomNavigation(BuildContext blocContext, int index) {
    if (index == _currentNavIndex) {
      if (index == 0) {
        blocContext
            .read<MandorDashboardBloc>()
            .add(const MandorDashboardRefreshRequested());
      } else if (index == 1) {
        _reloadHarvestMasterData(blocContext);
      } else if (index == 2) {
        _refreshHarvestHistory(blocContext);
      } else if (index == 3) {
        setState(() {
          _syncRefreshSignal++;
        });
      }
      return;
    }

    setState(() {
      _currentNavIndex = index;
      if (index == 3) {
        _syncRefreshSignal++;
      }
    });

    if (index == 0) {
      blocContext
          .read<MandorDashboardBloc>()
          .add(const MandorDashboardRefreshRequested());
    } else if (index == 1) {
      _reloadHarvestMasterData(blocContext);
    } else if (index == 2) {
      _refreshHarvestHistory(blocContext);
    }
  }

  void _navigateTo(String route) {
    final normalized = route.trim().toLowerCase();
    if (normalized == '/history' ||
        normalized == '/panen' ||
        normalized == '/mandor/history' ||
        normalized == '/dashboard/mandor/history') {
      setState(() => _currentNavIndex = 2);
      _refreshHarvestHistory(context);
      return;
    }

    if (normalized == '/approval' ||
        normalized == '/approvals' ||
        normalized == '/asisten/approval') {
      Navigator.pushNamed(
        context,
        AppRoutes.asisten,
        arguments: const {'tab': 1},
      );
      return;
    }

    if (normalized == '/harvest/input') {
      Navigator.pushNamed(context, AppRoutes.harvestInput);
      return;
    }

    Navigator.pushNamed(context, route);
  }

  Future<void> _showNotifications(BuildContext context) async {
    final harvestBloc = context.read<HarvestBloc>();
    final result = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(
        builder: (context) => const MandorNotificationPage(),
      ),
    );

    await _loadUnreadCount();
    if (!mounted || result == null) {
      return;
    }

    final tab = _toInt(result['tab']) ?? 2;
    final panenId = _toNullableString(result['panenId']);

    setState(() {
      _currentNavIndex = tab.clamp(0, 3).toInt();
      _focusHarvestId = panenId;
    });

    if (_currentNavIndex == 2) {
      _refreshHarvestHistoryWithBloc(harvestBloc);
    }
  }

  Future<void> _showProfilePage(BuildContext blocContext) async {
    await Navigator.of(blocContext).push(
      MaterialPageRoute(
        builder: (context) => Scaffold(
          backgroundColor: MandorTheme.gray900,
          appBar: AppBar(
            title: const Text('Profil Mandor'),
            backgroundColor: MandorTheme.darkGreen,
            foregroundColor: Colors.white,
            elevation: 0,
          ),
          body: const GenZProfileTab(),
        ),
      ),
    );
  }

  void _reloadHarvestMasterData(BuildContext blocContext) {
    final harvestBloc = blocContext.read<HarvestBloc>();
    harvestBloc.add(const HarvestEmployeesLoadRequested());
    harvestBloc.add(const HarvestBlocksLoadRequested());
  }

  void _refreshHarvestHistory(BuildContext blocContext) {
    final harvestBloc = blocContext.read<HarvestBloc>();
    _refreshHarvestHistoryWithBloc(harvestBloc);
  }

  void _refreshHarvestHistoryWithBloc(HarvestBloc harvestBloc) {
    harvestBloc.add(
      HarvestSummaryRequested(date: DateTime.now()),
    );
  }
}
