import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../data/repositories/manager_monitor_repository.dart';
import '../../../../../../core/di/service_locator.dart';
import '../../../../../../core/network/graphql_client_service.dart';
import '../../../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../../../../core/services/fcm_service.dart';
import '../../../../../../core/utils/sync_error_message_helper.dart';
import '../../../blocs/manager_dashboard_bloc.dart';
import '../manager_theme.dart';
import '../molecules/manager_monitor_components.dart';
import 'manager_analytics_tab.dart';
import 'manager_profile_tab.dart';

class ManagerMonitorTab extends StatefulWidget {
  const ManagerMonitorTab({super.key});

  @override
  State<ManagerMonitorTab> createState() => _ManagerMonitorTabState();
}

class _ManagerMonitorTabState extends State<ManagerMonitorTab> {
  static const String _cacheKey = 'manager_monitor_snapshot_v1';

  int _selectedFilterIndex = 0;
  bool _isGridView = false;
  bool _isLoading = true;
  String? _errorMessage;
  ManagerMonitorSnapshot _snapshot = ManagerMonitorSnapshot.empty();
  late DateTimeRange _selectedDateRange;
  StreamSubscription<HarvestNotificationEvent>?
  _harvestNotificationSubscription;
  Timer? _notificationRefreshDebounce;

  late final ManagerMonitorRepository _repository;
  final Logger _logger = Logger();

  final List<String> _filters = ['Semua', 'Mandor', 'Asisten'];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selectedDateRange = DateTimeRange(
      start: DateTime(now.year, now.month, 1),
      end: DateTime(now.year, now.month, now.day),
    );
    _repository = ManagerMonitorRepository(
      graphqlClient: ServiceLocator.get<GraphQLClientService>(),
    );
    _harvestNotificationSubscription = FCMService.harvestNotificationStream
        .listen(_handleHarvestNotification);
    _restoreCachedSnapshot();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _loadMonitorData();
      }
    });
  }

  @override
  void dispose() {
    _harvestNotificationSubscription?.cancel();
    _notificationRefreshDebounce?.cancel();
    super.dispose();
  }

  Future<void> _loadMonitorData({bool showLoader = true}) async {
    if (showLoader) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final snapshot = await _repository.fetchSnapshot(
        dateFrom: _selectedDateRange.start,
        dateTo: _selectedDateRange.end,
      );
      if (!mounted) return;
      setState(() {
        _snapshot = snapshot;
        _isLoading = false;
        _errorMessage = null;
      });
      unawaited(_saveSnapshotCache(snapshot));
    } catch (error) {
      _logger.e('Failed to load manager monitor data: $error');
      final fallbackMessage = SyncErrorMessageHelper.toUserMessage(
        error,
        action: 'memuat data monitor',
      );
      final cachedSnapshot = await _readCachedSnapshot();
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        if (cachedSnapshot != null && cachedSnapshot.members.isNotEmpty) {
          _snapshot = cachedSnapshot;
          _errorMessage =
              'Menampilkan data terakhir tersimpan. $fallbackMessage';
        } else {
          _errorMessage = fallbackMessage;
        }
      });
    }
  }

  Future<void> _restoreCachedSnapshot() async {
    final cachedSnapshot = await _readCachedSnapshot();
    if (!mounted || cachedSnapshot == null || cachedSnapshot.members.isEmpty) {
      return;
    }

    setState(() {
      _snapshot = cachedSnapshot;
      _isLoading = false;
    });
  }

  Future<void> _saveSnapshotCache(ManagerMonitorSnapshot snapshot) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheKey, jsonEncode(snapshot.toJson()));
    } catch (error) {
      _logger.w('Failed to save manager monitor cache: $error');
    }
  }

  Future<ManagerMonitorSnapshot?> _readCachedSnapshot() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_cacheKey);
      if (raw == null || raw.trim().isEmpty) {
        return null;
      }
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) {
        return null;
      }
      return ManagerMonitorSnapshot.fromJson(decoded);
    } catch (error) {
      _logger.w('Failed to read manager monitor cache: $error');
      return null;
    }
  }

  void _handleHarvestNotification(HarvestNotificationEvent event) {
    if (!mounted) {
      return;
    }

    final authState = context.read<AuthBloc>().state;
    if (authState is! AuthAuthenticated) {
      return;
    }

    if (authState.user.role.toUpperCase() != 'MANAGER') {
      return;
    }

    final action = event.action.toUpperCase();
    final type = event.type.toUpperCase();
    final isRelevant =
        type == 'HARVEST_ESCALATION' ||
        type == 'HARVEST_SLA_BREACH' ||
        type == 'HARVEST_STATUS_UPDATE' ||
        type == 'HARVEST_PKS_UPDATE' ||
        action == 'ESCALATED' ||
        action == 'SLA_BREACH' ||
        action == 'APPROVED' ||
        action == 'REJECTED' ||
        action == 'CORRECTION_REQUIRED' ||
        action == 'PKS_RECEIVED' ||
        action == 'PKS_WEIGHED';

    if (!isRelevant) {
      return;
    }

    _notificationRefreshDebounce?.cancel();
    _notificationRefreshDebounce = Timer(const Duration(milliseconds: 500), () {
      if (!mounted) {
        return;
      }
      _loadMonitorData(showLoader: false);
    });
  }

  List<ManagerMonitorMember> _filteredMembers() {
    final selectedFilter = _filters[_selectedFilterIndex];

    final filtered = _snapshot.members
        .where((member) {
          if (selectedFilter == 'Semua') {
            return true;
          }
          return member.role == selectedFilter;
        })
        .toList(growable: false);

    filtered.sort((a, b) {
      final byPerformance = b.performance.compareTo(a.performance);
      if (byPerformance != 0) return byPerformance;

      final byProduction = b.productionTon.compareTo(a.productionTon);
      if (byProduction != 0) return byProduction;

      return a.name.toLowerCase().compareTo(b.name.toLowerCase());
    });

    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final members = _filteredMembers();
    final formattedEfficiency = double.parse(
      _snapshot.efficiency.toStringAsFixed(1),
    );

    return Scaffold(
      backgroundColor: ManagerTheme.scaffoldBackground,
      appBar: AppBar(
        title: const Text(
          'Tim Estate',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: Colors.white),
            onPressed: () => _showComingSoon(context, 'Pencarian'),
          ),
          IconButton(
            icon: const Icon(Icons.filter_list, color: Colors.white),
            onPressed: _selectDateRange,
          ),
        ],
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: ManagerTheme.headerGradient,
          ),
        ),
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: () => _loadMonitorData(showLoader: false),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    MonitorSummaryCard(
                      totalTeam: _snapshot.totalTeam,
                      totalMandor: _snapshot.totalMandor,
                      totalAsisten: _snapshot.totalAsisten,
                      totalPemanen: _snapshot.totalPemanen,
                      efficiency: formattedEfficiency,
                    ),
                    const SizedBox(height: 16),
                    MonitorFilterTabs(
                      filters: _filters,
                      selectedIndex: _selectedFilterIndex,
                      onFilterSelected: (index) {
                        setState(() => _selectedFilterIndex = index);
                      },
                    ),
                    const SizedBox(height: 16),
                    MonitorSortBar(
                      isGridView: _isGridView,
                      onToggleView: () {
                        setState(() => _isGridView = !_isGridView);
                      },
                    ),
                    const SizedBox(height: 10),
                    _buildPeriodInfo(),
                    if (_snapshot.warningMessage != null) ...[
                      const SizedBox(height: 12),
                      _buildWarningBanner(_snapshot.warningMessage!),
                    ],
                    if (_errorMessage != null &&
                        _snapshot.members.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _buildWarningBanner(_errorMessage!),
                    ],
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
            if (_isLoading && _snapshot.members.isEmpty)
              const SliverToBoxAdapter(
                child: SizedBox(
                  height: 280,
                  child: Center(child: CircularProgressIndicator()),
                ),
              )
            else if (_errorMessage != null && _snapshot.members.isEmpty)
              SliverToBoxAdapter(
                child: _buildErrorState(
                  context,
                  message: _errorMessage!,
                  onRetry: _loadMonitorData,
                ),
              )
            else if (members.isEmpty)
              const SliverToBoxAdapter(child: _MonitorEmptyState())
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate((context, index) {
                    final member = members[index];
                    return MonitorEmployeeCard(
                      name: member.name,
                      role: member.role,
                      division: member.division,
                      performance: double.parse(
                        member.performance.toStringAsFixed(1),
                      ),
                      production: double.parse(
                        member.productionTon.toStringAsFixed(1),
                      ),
                      isActive: member.isActive,
                      initials: _initials(member.name),
                      avatarColor: _avatarColor(member.role),
                      onDetail: () => _showMemberDetail(context, member),
                      onEvaluate: () =>
                          _showComingSoon(context, 'Evaluasi ${member.name}'),
                    );
                  }, childCount: members.length),
                ),
              ),
            const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNavigation(context),
    );
  }

  Color _avatarColor(String role) {
    switch (role.toLowerCase()) {
      case 'mandor':
        return Colors.indigo;
      case 'asisten':
        return Colors.deepPurple;
      default:
        return Colors.blueGrey;
    }
  }

  String _initials(String fullName) {
    final words = fullName
        .trim()
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .toList(growable: false);

    if (words.isEmpty) {
      return '?';
    }
    if (words.length == 1) {
      return words.first.substring(0, 1).toUpperCase();
    }
    return '${words[0][0]}${words[1][0]}'.toUpperCase();
  }

  void _showMemberDetail(BuildContext context, ManagerMonitorMember member) {
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(member.name, style: ManagerTheme.headingMedium),
              const SizedBox(height: 12),
              _buildDetailRow('Role', member.role),
              _buildDetailRow('Divisi', member.division),
              _buildDetailRow(
                'Performa',
                '${member.performance.toStringAsFixed(1)}%',
              ),
              _buildDetailRow(
                'Produksi',
                '${member.productionTon.toStringAsFixed(1)} ton',
              ),
              _buildDetailRow(
                'Status',
                member.isActive ? 'Aktif' : 'Tidak aktif',
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 90,
            child: Text(label, style: ManagerTheme.bodySmall),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: ManagerTheme.textPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWarningBanner(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: ManagerTheme.pendingOrange.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: ManagerTheme.pendingOrange.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.warning_amber_rounded,
            size: 18,
            color: ManagerTheme.pendingOrange,
          ),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: ManagerTheme.bodySmall)),
        ],
      ),
    );
  }

  Widget _buildErrorState(
    BuildContext context, {
    required String message,
    required Future<void> Function({bool showLoader}) onRetry,
  }) {
    return SizedBox(
      height: 300,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.cloud_off_rounded,
                size: 56,
                color: ManagerTheme.textMuted,
              ),
              const SizedBox(height: 10),
              Text(
                'Monitor gagal dimuat',
                style: ManagerTheme.headingMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                message,
                style: ManagerTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 14),
              ElevatedButton.icon(
                onPressed: () => onRetry(),
                icon: const Icon(Icons.refresh),
                label: const Text('Coba Lagi'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: ManagerTheme.primaryPurple,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showComingSoon(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$message dalam pengembangan'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _selectDateRange() async {
    final now = DateTime.now();
    final firstDate = DateTime(now.year - 2, 1, 1);
    final lastDate = DateTime(now.year + 1, 12, 31);

    final picked = await showDateRangePicker(
      context: context,
      firstDate: firstDate,
      lastDate: lastDate,
      initialDateRange: _selectedDateRange,
      saveText: 'Terapkan',
      helpText: 'Pilih Periode Monitor',
    );

    if (picked == null || !mounted) {
      return;
    }

    setState(() {
      _selectedDateRange = DateTimeRange(
        start: DateTime(
          picked.start.year,
          picked.start.month,
          picked.start.day,
        ),
        end: DateTime(picked.end.year, picked.end.month, picked.end.day),
      );
    });

    await _loadMonitorData();
  }

  Widget _buildPeriodInfo() {
    final start = _formatDate(_selectedDateRange.start);
    final end = _formatDate(_selectedDateRange.end);

    return InkWell(
      onTap: _selectDateRange,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.date_range_rounded,
              size: 18,
              color: ManagerTheme.primaryPurple,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Periode: $start - $end',
                style: ManagerTheme.bodySmall.copyWith(
                  color: ManagerTheme.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const Icon(
              Icons.edit_calendar_rounded,
              size: 18,
              color: ManagerTheme.textMuted,
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    return '$day/$month/${date.year}';
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
        currentIndex: 1, // Monitor is index 1
        selectedItemColor: ManagerTheme.primaryPurple,
        unselectedItemColor: ManagerTheme.textMuted,
        selectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
        unselectedLabelStyle: const TextStyle(fontSize: 12),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(icon: Icon(Icons.monitor), label: 'Monitor'),
          BottomNavigationBarItem(
            icon: Icon(Icons.bar_chart_outlined),
            label: 'Analytics',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            label: 'Profile',
          ),
        ],
        onTap: (index) => _handleBottomNavigation(context, index),
      ),
    );
  }

  void _handleBottomNavigation(BuildContext context, int index) {
    switch (index) {
      case 0:
        // Go back to Dashboard
        Navigator.pop(context);
        break;
      case 1:
        // Already on Monitor
        break;
      case 2:
        // Go to Analytics using pushReplacement
        final dashboardBloc = _tryGetDashboardBloc(context);
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => dashboardBloc == null
                ? const ManagerAnalyticsTab()
                : BlocProvider<ManagerDashboardBloc>.value(
                    value: dashboardBloc,
                    child: const ManagerAnalyticsTab(),
                  ),
          ),
        );
        break;
      case 3:
        // Go to Profile using pushReplacement
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const ManagerProfileTab()),
        );
        break;
    }
  }

  ManagerDashboardBloc? _tryGetDashboardBloc(BuildContext context) {
    try {
      return context.read<ManagerDashboardBloc>();
    } catch (_) {
      return null;
    }
  }
}

class _MonitorEmptyState extends StatelessWidget {
  const _MonitorEmptyState();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 260,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.groups_2_outlined,
                size: 56,
                color: ManagerTheme.textMuted,
              ),
              const SizedBox(height: 10),
              Text(
                'Belum ada data tim',
                style: ManagerTheme.headingMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                'Belum ada data panen bawahan pada server.',
                style: ManagerTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
