import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../../../core/models/jwt_models.dart';
import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../approval/data/repositories/approval_repository.dart';
import '../../../approval/domain/entities/approval_item.dart';
import '../../../approval/presentation/blocs/approval_bloc.dart';
import '../../../approval/presentation/pages/approval_view.dart';
import '../../../monitoring/presentation/blocs/monitoring_bloc.dart';
import '../../../../shared/widgets/auth_listener_wrapper.dart';
import '../../../../core/utils/sync_error_message_helper.dart';

// Import Asisten Dashboard Components (Light Mode)
import 'asisten_dashboard/asisten_theme.dart';
import 'asisten_dashboard/atoms/asisten_icon_badge.dart';
import 'asisten_dashboard/organisms/asisten_actions_grid.dart';
import 'asisten_dashboard/organisms/asisten_bottom_nav.dart';
import 'asisten_dashboard/organisms/asisten_monitoring_tab.dart';
import 'asisten_dashboard/organisms/asisten_notification_page.dart';
import 'asisten_dashboard/organisms/asisten_pending_section.dart';
import 'asisten_dashboard/organisms/asisten_profile_tab.dart';
import 'asisten_dashboard/organisms/asisten_stats_grid.dart';
import 'asisten_dashboard/organisms/asisten_welcome_section.dart';
import '../../../../core/di/service_locator.dart';
import '../../../../core/services/notification_storage_service.dart';
import '../../../../core/services/fcm_service.dart';

/// Asisten Page with Light Mode Design
///
/// Features:
/// - Light Mode with Blue accents
/// - Modular Atomic Design components
/// - Navigation between Dashboard, Approvals, Monitoring, and Profile
class AsistenPage extends StatefulWidget {
  const AsistenPage({super.key});

  @override
  State<AsistenPage> createState() => _AsistenPageState();
}

class _AsistenPageState extends State<AsistenPage> {
  static final Logger _logger = Logger();
  final NotificationStorageService _notificationStorage =
      ServiceLocator.get<NotificationStorageService>();
  final ApprovalRepository _approvalRepository =
      ServiceLocator.get<ApprovalRepository>();

  int _currentNavIndex = 0;
  bool _isDashboardLoading = false;
  bool _isSubmittingApproval = false;
  int _unreadNotificationCount = 0;
  StreamSubscription<int>? _unreadCountSubscription;
  StreamSubscription<HarvestNotificationEvent>?
      _harvestNotificationSubscription;
  String? _dashboardError;
  String? _loadedUserId;
  String? _lastRouteArgsSignature;
  String _approvalInitialStatus = 'PENDING';
  String? _focusApprovalId;

  ApprovalStats _dashboardStats =
      const ApprovalStats(pendingCount: 0, approvedCount: 0, rejectedCount: 0);
  List<ApprovalItem> _pendingApprovals = const [];

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
    _harvestNotificationSubscription =
        FCMService.harvestNotificationStream.listen(_handleHarvestNotification);

    final authState = context.read<AuthBloc>().state;
    if (authState is AuthAuthenticated) {
      _loadedUserId = authState.user.id;
      _loadDashboardData(authState.user);
    }
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

  void _applyRouteArgumentsIfNeeded(User user) {
    final args = ModalRoute.of(context)?.settings.arguments;
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

    final targetTab = _normalizeAsistenTab(tab, panenId);
    final targetStatus = _resolveApprovalStatus(action, type);
    final shouldLoadDashboard = targetTab == 0;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }

      setState(() {
        if (targetTab != null) {
          _currentNavIndex = targetTab;
        }
        _approvalInitialStatus = targetStatus;
        _focusApprovalId = panenId;
      });

      if (shouldLoadDashboard) {
        _loadDashboardData(user, silent: true);
      }

      if (panenId != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Membuka transaksi panen: $panenId'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AsistenTheme.primaryBlue,
          ),
        );
      }
    });
  }

  int? _normalizeAsistenTab(int? tab, String? panenId) {
    if (tab == null && panenId == null) {
      return null;
    }
    final fallback = panenId != null ? 1 : 0;
    final resolved = tab ?? fallback;
    if (resolved < 0 || resolved > 3) {
      return fallback;
    }
    return resolved;
  }

  String _resolveApprovalStatus(String? action, String? type) {
    final normalizedAction = (action ?? '').toUpperCase();
    final normalizedType = (type ?? '').toUpperCase();

    if (normalizedType == 'HARVEST_APPROVAL_NEEDED' ||
        normalizedAction == 'APPROVAL_NEEDED') {
      return 'PENDING';
    }
    if (normalizedAction == 'APPROVED') {
      return 'APPROVED';
    }
    if (normalizedAction == 'REJECTED') {
      return 'REJECTED';
    }
    return 'PENDING';
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
    super.dispose();
  }

  Future<void> _handleHarvestNotification(
      HarvestNotificationEvent event) async {
    if (!mounted) {
      return;
    }

    final authState = context.read<AuthBloc>().state;
    if (authState is! AuthAuthenticated) {
      return;
    }

    if (authState.user.role.toUpperCase() != 'ASISTEN') {
      return;
    }

    final targetStatus = _resolveApprovalStatus(event.action, event.type);
    final shouldUpdateFocus = _focusApprovalId != event.panenId ||
        _approvalInitialStatus != targetStatus;

    if (shouldUpdateFocus) {
      setState(() {
        _focusApprovalId = event.panenId;
        _approvalInitialStatus = targetStatus;
      });
    }

    await _loadDashboardData(authState.user, silent: true);
  }

  @override
  Widget build(BuildContext context) {
    return AuthListenerWrapper(
      child: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, authState) {
          if (authState is AuthAuthenticated) {
            _logger.i(
                'Loading Asisten Dashboard for user: ${authState.user.username}');
            _applyRouteArgumentsIfNeeded(authState.user);
            _ensureDashboardDataLoaded(authState.user);
            return _buildScaffold(context, authState);
          }
          return _buildLoadingScreen();
        },
      ),
    );
  }

  Widget _buildScaffold(BuildContext context, AuthAuthenticated authState) {
    return Scaffold(
      backgroundColor: AsistenTheme.scaffoldBackground,
      appBar: _buildAppBar(authState),
      body: _buildBody(context, authState),
      bottomNavigationBar: AsistenBottomNav(
        currentIndex: _currentNavIndex,
        onTap: (index) => _handleBottomNavigation(index, authState.user),
      ),
    );
  }

  void _handleBottomNavigation(int index, User user) {
    setState(() => _currentNavIndex = index);

    if (index == 0) {
      _loadDashboardData(user, silent: true);
    }
  }

  PreferredSizeWidget _buildAppBar(AuthAuthenticated state) {
    return AppBar(
      title: const Text(
        'Asisten Dashboard',
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w600,
          fontSize: 18,
        ),
      ),
      flexibleSpace: Container(
        decoration: const BoxDecoration(
          gradient: AsistenTheme.headerGradient,
        ),
      ),
      backgroundColor: Colors.transparent,
      elevation: 0,
      iconTheme: const IconThemeData(color: Colors.white),
      actions: [
        IconButton(
          icon: AsistenIconBadge(
            icon: Icons.notifications_outlined,
            badgeCount: _unreadNotificationCount,
          ),
          onPressed: () => _showNotifications(context),
          tooltip: 'Notifications',
        ),
        PopupMenuButton<String>(
          icon: const Icon(Icons.menu, color: Colors.white),
          onSelected: (value) {
            if (value == 'profile') {
              setState(() => _currentNavIndex = 3);
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
                  Icon(Icons.person_outline, color: AsistenTheme.textSecondary),
                  const SizedBox(width: 12),
                  const Text('Profile'),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'settings',
              child: Row(
                children: [
                  Icon(Icons.settings_outlined,
                      color: AsistenTheme.textSecondary),
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
                  Icon(Icons.logout, color: AsistenTheme.rejectedRed),
                  const SizedBox(width: 12),
                  Text('Logout',
                      style: TextStyle(color: AsistenTheme.rejectedRed)),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildBody(BuildContext context, AuthAuthenticated authState) {
    return IndexedStack(
      index: _currentNavIndex,
      children: [
        // 0. Dashboard Tab
        _buildDashboardTab(context, authState),

        // 1. Approval Tab
        _buildApprovalTab(),

        // 2. Monitoring Tab
        BlocProvider(
          create: (context) => ServiceLocator.get<MonitoringBloc>(),
          child: const AsistenMonitoringTab(),
        ),

        // 3. Profile Tab
        AsistenProfileTab(
          onLogout: () {
            // Navigation handled by AuthBloc listener
          },
        ),
      ],
    );
  }

  Widget _buildDashboardTab(BuildContext context, AuthAuthenticated authState) {
    if (_isDashboardLoading && _pendingApprovals.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_dashboardError != null && _pendingApprovals.isEmpty) {
      return _buildDashboardErrorState(authState.user);
    }

    final pendingItems = _pendingApprovals
        .map((item) => ApprovalItemData(
              id: item.id,
              mandorName: item.mandorName,
              blok: item.blockName,
              volume: '${item.tbsCount} jjg',
              employees: _buildEmployeeLabel(item),
              time: _resolveElapsedTime(item),
              status: item.status,
            ))
        .toList(growable: false);

    return RefreshIndicator(
      onRefresh: () => _loadDashboardData(authState.user, silent: true),
      color: AsistenTheme.primaryBlue,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AsistenTheme.paddingMedium),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AsistenWelcomeSection(
              userName: _displayName(authState.user),
              division: authState.user.division,
              estateName: authState.user.estate,
              pendingCount: _dashboardStats.pendingCount,
              approvedCount: _dashboardStats.approvedCount,
              rejectedCount: _dashboardStats.rejectedCount,
            ),
            const SizedBox(height: AsistenTheme.sectionSpacing),
            AsistenStatsGrid(
              pendingApprovalCount: _dashboardStats.pendingCount,
              approvedTodayCount: _dashboardStats.approvedCount,
              totalPendingTbs: _totalPendingTbs,
              activeMandorCount: _activeMandorCount,
            ),
            const SizedBox(height: AsistenTheme.sectionSpacing),
            AsistenActionsGrid(
              onApprovals: () => setState(() => _currentNavIndex = 1),
              onBatchApproval: () => setState(() => _currentNavIndex = 1),
              onQualityCheck: () => _showComingSoon(context, 'Quality Check'),
              onMonitoring: () => setState(() => _currentNavIndex = 2),
              onReports: () => _showComingSoon(context, 'Laporan'),
              onHistory: () => _showComingSoon(context, 'History'),
            ),
            const SizedBox(height: AsistenTheme.sectionSpacing),
            if (_dashboardError != null) ...[
              _buildDashboardWarningBanner(_dashboardError!),
              const SizedBox(height: AsistenTheme.paddingMedium),
            ],
            AsistenPendingSection(
              items: pendingItems,
              onApprove: _isSubmittingApproval
                  ? null
                  : (id) => _showApproveConfirmation(context, id),
              onReject: _isSubmittingApproval
                  ? null
                  : (id) => _showRejectDialog(context, id),
              onViewAll: () => setState(() => _currentNavIndex = 1),
            ),
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  Widget _buildDashboardErrorState(User user) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_off_rounded,
                size: 60, color: AsistenTheme.textMuted),
            const SizedBox(height: 12),
            Text(
              'Gagal memuat data dashboard',
              style: AsistenTheme.headingMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              _dashboardError ?? 'Terjadi kesalahan',
              style: AsistenTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => _loadDashboardData(user),
              icon: const Icon(Icons.refresh),
              label: const Text('Coba Lagi'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AsistenTheme.primaryBlue,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDashboardWarningBanner(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AsistenTheme.pendingOrange.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: AsistenTheme.pendingOrange.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.warning_amber_rounded,
              size: 18, color: AsistenTheme.pendingOrange),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: AsistenTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingScreen() {
    return Scaffold(
      backgroundColor: AsistenTheme.scaffoldBackground,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(
              valueColor:
                  AlwaysStoppedAnimation<Color>(AsistenTheme.primaryBlue),
            ),
            const SizedBox(height: 16),
            Text(
              'Memuat dashboard...',
              style: AsistenTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showNotifications(BuildContext context) async {
    final result = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(
        builder: (context) => const AsistenNotificationPage(),
      ),
    );

    await _loadUnreadCount();
    if (!mounted || result == null) {
      return;
    }

    final tab = _toInt(result['tab']) ?? 1;
    final panenId = _toNullableString(result['panenId']);
    final status = _toNullableString(result['status']) ?? 'PENDING';

    setState(() {
      _currentNavIndex = tab.clamp(0, 3).toInt();
      _approvalInitialStatus = status;
      _focusApprovalId = panenId;
    });
  }

  void _showComingSoon(BuildContext context, String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature dalam pengembangan'),
        backgroundColor: AsistenTheme.pendingOrange,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  String _displayName(User user) {
    if (user.fullName.trim().isNotEmpty) {
      return user.fullName.trim();
    }
    return user.username;
  }

  void _ensureDashboardDataLoaded(User user) {
    if (_loadedUserId == user.id) {
      return;
    }

    _loadedUserId = user.id;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _loadDashboardData(user);
      }
    });
  }

  Future<bool> _loadDashboardData(
    User user, {
    bool silent = false,
  }) async {
    _logger.d('Refreshing Asisten dashboard data for user: ${user.username}');

    if (!silent) {
      setState(() {
        _isDashboardLoading = true;
        _dashboardError = null;
      });
    } else if (_dashboardError != null) {
      setState(() => _dashboardError = null);
    }

    try {
      final results = await Future.wait([
        _approvalRepository.getPendingApprovals(status: 'PENDING'),
        _approvalRepository.getApprovalStats(),
      ]);
      final pendingApprovals = results[0] as List<ApprovalItem>;
      final stats = results[1] as ApprovalStats;

      if (!mounted) {
        return false;
      }

      setState(() {
        _pendingApprovals = pendingApprovals;
        _dashboardStats = stats;
        _isDashboardLoading = false;
      });

      await _notificationStorage.reconcilePendingHarvestApprovalNotifications(
        pendingApprovals.map((item) => item.id).toSet(),
      );
      return true;
    } catch (e) {
      _logger.e('Failed to load Asisten dashboard data: $e');
      final friendlyMessage = SyncErrorMessageHelper.toUserMessage(
        e,
        action: 'memuat dashboard asisten',
      );
      if (mounted) {
        setState(() {
          _isDashboardLoading = false;
          _dashboardError = friendlyMessage;
        });
      }
      return false;
    }
  }

  String _buildEmployeeLabel(ApprovalItem item) {
    if (item.employeeCount > 0) {
      return '${item.employeeCount} org';
    }

    final employees = item.employees.trim();
    if (employees.isNotEmpty) {
      return employees;
    }

    return '-';
  }

  String _resolveElapsedTime(ApprovalItem item) {
    final elapsedTime = item.elapsedTime.trim();
    if (elapsedTime.isNotEmpty) {
      return elapsedTime;
    }

    final duration = DateTime.now().difference(item.submittedAt);
    if (duration.inMinutes < 1) {
      return 'Baru saja';
    }
    if (duration.inHours < 1) {
      return '${duration.inMinutes} menit lalu';
    }
    if (duration.inDays < 1) {
      return '${duration.inHours} jam lalu';
    }
    return '${duration.inDays} hari lalu';
  }

  int get _totalPendingTbs {
    return _pendingApprovals.fold(0, (sum, item) => sum + item.tbsCount);
  }

  int get _activeMandorCount {
    final mandorKeys = _pendingApprovals.map((item) {
      if (item.mandorId.trim().isNotEmpty) {
        return item.mandorId.trim();
      }
      return item.mandorName.trim();
    }).where((key) => key.isNotEmpty);

    return mandorKeys.toSet().length;
  }

  void _showApproveConfirmation(BuildContext context, String approvalId) {
    final approval = _findApprovalItem(approvalId);
    if (approval == null) {
      return;
    }

    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Setujui Panen?'),
        content: Text(
          'Anda akan menyetujui data panen dari ${approval.mandorName}.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              _approvePendingItem(context, approvalId);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AsistenTheme.approvedGreen,
              foregroundColor: Colors.white,
            ),
            child: const Text('Setuju'),
          ),
        ],
      ),
    );
  }

  void _showRejectDialog(BuildContext context, String approvalId) {
    final approval = _findApprovalItem(approvalId);
    if (approval == null) {
      return;
    }

    final reasonController = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Tolak Panen'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Berikan alasan penolakan untuk ${approval.mandorName}.'),
            const SizedBox(height: 8),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                hintText: 'Alasan penolakan...',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              final reason = reasonController.text.trim();
              if (reason.isEmpty) {
                ScaffoldMessenger.of(dialogContext).showSnackBar(
                  const SnackBar(content: Text('Alasan harus diisi')),
                );
                return;
              }
              Navigator.pop(dialogContext);
              _rejectPendingItem(context, approvalId, reason);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AsistenTheme.rejectedRed,
              foregroundColor: Colors.white,
            ),
            child: const Text('Tolak'),
          ),
        ],
      ),
    );
  }

  Future<void> _approvePendingItem(BuildContext context, String id) async {
    if (_isSubmittingApproval) {
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    final authBloc = context.read<AuthBloc>();

    setState(() => _isSubmittingApproval = true);
    try {
      await _approvalRepository.approveHarvest(id);
      await _notificationStorage.markHarvestApprovalNotificationsAsRead(id);
      if (mounted) {
        messenger.showSnackBar(
          SnackBar(
            content: const Text('Data berhasil disetujui'),
            backgroundColor: AsistenTheme.approvedGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      final authState = authBloc.state;
      if (authState is AuthAuthenticated) {
        await _loadDashboardData(authState.user, silent: true);
      }
    } catch (e) {
      final friendlyMessage = SyncErrorMessageHelper.toUserMessage(
        e,
        action: 'menyetujui data panen',
      );
      if (mounted) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(friendlyMessage),
            backgroundColor: AsistenTheme.rejectedRed,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmittingApproval = false);
      }
    }
  }

  Future<void> _rejectPendingItem(
    BuildContext context,
    String id,
    String reason,
  ) async {
    if (_isSubmittingApproval) {
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    final authBloc = context.read<AuthBloc>();

    setState(() => _isSubmittingApproval = true);
    try {
      await _approvalRepository.rejectHarvest(id, reason);
      await _notificationStorage.markHarvestApprovalNotificationsAsRead(id);
      if (mounted) {
        messenger.showSnackBar(
          SnackBar(
            content: const Text('Data berhasil ditolak'),
            backgroundColor: AsistenTheme.pendingOrange,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      final authState = authBloc.state;
      if (authState is AuthAuthenticated) {
        await _loadDashboardData(authState.user, silent: true);
      }
    } catch (e) {
      final friendlyMessage = SyncErrorMessageHelper.toUserMessage(
        e,
        action: 'menolak data panen',
      );
      if (mounted) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(friendlyMessage),
            backgroundColor: AsistenTheme.rejectedRed,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmittingApproval = false);
      }
    }
  }

  ApprovalItem? _findApprovalItem(String id) {
    for (final item in _pendingApprovals) {
      if (item.id == id) {
        return item;
      }
    }
    return null;
  }

  Widget _buildApprovalTab() {
    return BlocProvider(
      create: (context) => ServiceLocator.get<ApprovalBloc>()
        ..add(ApprovalLoadRequested(status: _approvalInitialStatus)),
      child: ApprovalView(
        key: ValueKey(
            'approval-$_approvalInitialStatus-${_focusApprovalId ?? ''}'),
        initialStatus: _approvalInitialStatus,
        focusApprovalId: _focusApprovalId,
      ),
    );
  }
}
