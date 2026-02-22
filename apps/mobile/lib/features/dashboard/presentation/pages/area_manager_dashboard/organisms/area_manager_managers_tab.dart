import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../area_manager_theme.dart';
import '../molecules/area_manager_managers_components.dart';
import '../../../../data/models/area_manager_dashboard_models.dart';
import '../../../blocs/area_manager_dashboard_bloc.dart';
import 'area_manager_monitor_tab.dart';

/// Area Manager Managers Tab - Manager Performance Overview
///
/// Displays real manager data via [AreaManagerDashboardBloc].
/// Features:
/// - Summary header with manager count and key stats
/// - Filter tabs (Semua, Top Performers, Need Attention, New)
/// - Sort row with dropdown and view toggle
/// - Scrollable manager cards list with medals for top performers
/// - Bottom performance summary with batch evaluation FAB
class AreaManagerManagersTab extends StatefulWidget {
  const AreaManagerManagersTab({super.key});

  @override
  State<AreaManagerManagersTab> createState() => _AreaManagerManagersTabState();
}

class _AreaManagerManagersTabState extends State<AreaManagerManagersTab> {
  int _selectedFilterIndex = 0;
  String _selectedSort = 'Nama';
  bool _isGridView = false;

  final List<String> _filters = [
    'Semua',
    'Top Performers',
    'Need Attention',
    'New'
  ];
  final List<String> _sortOptions = ['Nama', 'Performa', 'Estate', 'Tonnage'];

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AreaManagerDashboardBloc, AreaManagerDashboardState>(
      builder: (context, state) {
        return Scaffold(
          backgroundColor: AreaManagerTheme.scaffoldBackground,
          appBar: _buildAppBar(),
          body: _buildBodyForState(state),
          bottomNavigationBar: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildBottomSummary(state),
              _buildBottomNavigation(context),
            ],
          ),
        );
      },
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      elevation: 0,
      automaticallyImplyLeading: false,
      flexibleSpace: Container(
        decoration: const BoxDecoration(
          gradient: AreaManagerTheme.headerGradient,
        ),
      ),
      title: const Text(
        'Manager Reports',
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 18,
        ),
      ),
      centerTitle: true,
      actions: [
        IconButton(
          icon: const Icon(Icons.search, color: Colors.white),
          onPressed: () => _showSearch(),
        ),
        IconButton(
          icon: const Icon(Icons.filter_alt_outlined, color: Colors.white),
          onPressed: () => _showFilterDialog(context),
        ),
      ],
    );
  }

  Widget _buildBodyForState(AreaManagerDashboardState state) {
    if (state is AreaManagerDashboardLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state is AreaManagerDashboardError) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text('Gagal memuat data', style: AreaManagerTheme.headingMedium),
              const SizedBox(height: 8),
              Text(state.message, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context
                    .read<AreaManagerDashboardBloc>()
                    .add(const AreaManagerDashboardRefreshRequested()),
                child: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      );
    }
    if (state is AreaManagerDashboardLoaded) {
      return _buildBody(state);
    }
    return const Center(child: CircularProgressIndicator());
  }

  Widget _buildBody(AreaManagerDashboardLoaded state) {
    final filtered = _getFilteredManagers(state.managers);

    return CustomScrollView(
      slivers: [
        // Summary Header — real data
        SliverToBoxAdapter(
          child: ManagersSummaryHeader(
            activeManagers: state.managers.where((m) => m.isActive).length,
            estateCount: state.stats.totalEstates,
            avgTonnage: state.stats.totalCompanies > 0
                ? '${(state.stats.monthlyProduction / state.stats.totalCompanies).toStringAsFixed(1)} ton'
                : '0 ton',
            performance: '${state.stats.avgEfficiency.toStringAsFixed(1)}%',
          ),
        ),

        // Filter Tabs
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: ManagersFilterTabs(
              filters: _filters,
              selectedIndex: _selectedFilterIndex,
              onFilterSelected: (index) {
                setState(() {
                  _selectedFilterIndex = index;
                });
              },
            ),
          ),
        ),

        // Sort Row
        SliverToBoxAdapter(
          child: ManagersSortRow(
            selectedSort: _selectedSort,
            isGridView: _isGridView,
            sortOptions: _sortOptions,
            onSortChanged: (value) {
              setState(() {
                _selectedSort = value;
              });
            },
            onViewToggle: (isGrid) {
              setState(() {
                _isGridView = isGrid;
              });
            },
          ),
        ),

        // Manager Cards — real data
        filtered.isEmpty
            ? SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: 32),
                  child: Center(
                    child: Text(
                      'Tidak ada manager untuk filter ini',
                      style: AreaManagerTheme.bodyMedium,
                    ),
                  ),
                ),
              )
            : SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final manager = filtered[index];
                    final rank = _getManagerRank(index);

                    return ManagerCard(
                      name: manager.name,
                      initials: manager.initials,
                      estateName: '',
                      role: 'Manager',
                      performance: 0.0,
                      monthlyTonnage: 0.0,
                      teamSize: 0,
                      isActive: manager.isActive,
                      rank: rank,
                      onDetail: () => _showManagerDetail(manager.name),
                      onEvaluate: () => _evaluateManager(manager.name),
                    );
                  },
                  childCount: filtered.length,
                ),
              ),

        // Bottom padding
        const SliverToBoxAdapter(
          child: SizedBox(height: 16),
        ),
      ],
    );
  }

  Widget _buildBottomSummary(AreaManagerDashboardState state) {
    if (state is AreaManagerDashboardLoaded) {
      return ManagersBottomSummary(
        avgPerformance: '${state.stats.avgEfficiency.toStringAsFixed(1)}%',
        targetAchievement:
            '${state.stats.targetAchievement.toStringAsFixed(0)}%',
        onEvaluateBatch: () => _showEvaluateBatch(),
      );
    }
    return ManagersBottomSummary(
      avgPerformance: '--',
      targetAchievement: '--',
      onEvaluateBatch: () => _showEvaluateBatch(),
    );
  }

  List<ManagerUserModel> _getFilteredManagers(List<ManagerUserModel> all) {
    List<ManagerUserModel> result;

    switch (_selectedFilterIndex) {
      case 1: // Top Performers → show active managers
        result = all.where((m) => m.isActive).toList();
        break;
      case 2: // Need Attention → show inactive managers
        result = all.where((m) => !m.isActive).toList();
        break;
      case 3: // New → no flag in current model
        result = [];
        break;
      default:
        result = List.from(all);
    }

    // Sort by name for "Nama" option; other sorts default to API order
    if (_selectedSort == 'Nama') {
      result.sort((a, b) => a.name.compareTo(b.name));
    }

    return result;
  }

  int? _getManagerRank(int index) {
    // Show medals only in "Semua" filter for first 3 entries
    if (_selectedFilterIndex == 0 && index < 3) {
      return index + 1;
    }
    return null;
  }

  Widget _buildBottomNavigation(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
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
        backgroundColor: Colors.white,
        selectedItemColor: AreaManagerTheme.primaryTeal,
        unselectedItemColor: AreaManagerTheme.textMuted,
        currentIndex: 3, // Managers is index 3
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
            icon: Icon(Icons.people_outline),
            activeIcon: Icon(Icons.people),
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

  void _handleBottomNavigation(BuildContext context, int index) {
    switch (index) {
      case 0:
        Navigator.pop(context);
        break;
      case 1:
        final bloc = context.read<AreaManagerDashboardBloc>();
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (ctx) => BlocProvider<AreaManagerDashboardBloc>.value(
              value: bloc,
              child: const AreaManagerMonitorTab(),
            ),
          ),
        );
        break;
      case 2:
        _showComingSoon('Reports');
        break;
      case 3:
        // Already on Managers
        break;
      case 4:
        _showComingSoon('Settings');
        break;
    }
  }

  void _showSearch() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Search coming soon'),
        backgroundColor: AreaManagerTheme.primaryTeal,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  void _showFilterDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Filter Managers',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.location_on_outlined),
              title: const Text('By Estate'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.bar_chart_outlined),
              title: const Text('By Performance Range'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.group_outlined),
              title: const Text('By Team Size'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.pop(context),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showManagerDetail(String name) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('View detail for $name'),
        backgroundColor: AreaManagerTheme.primaryTeal,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _evaluateManager(String name) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Evaluating $name...'),
        backgroundColor: const Color(0xFF22C55E),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _showEvaluateBatch() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Evaluasi Batch'),
        content: const Text(
          'Lakukan evaluasi batch untuk semua manager yang memerlukan review?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('Batch evaluation started...'),
                  backgroundColor: const Color(0xFF22C55E),
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF22C55E),
            ),
            child: const Text('Evaluasi'),
          ),
        ],
      ),
    );
  }

  void _showComingSoon(String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature coming soon'),
        backgroundColor: AreaManagerTheme.primaryTeal,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 2),
      ),
    );
  }
}

