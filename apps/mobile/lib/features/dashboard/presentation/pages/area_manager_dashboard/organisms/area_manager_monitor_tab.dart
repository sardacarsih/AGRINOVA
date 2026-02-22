import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../area_manager_theme.dart';
import '../molecules/area_manager_monitor_components.dart';
import '../../../../data/models/area_manager_dashboard_models.dart';
import '../../../blocs/area_manager_dashboard_bloc.dart';
import 'area_manager_managers_tab.dart';

/// Area Manager Monitor Tab - Multi-Estate Monitoring
///
/// Displays real company performance data via [AreaManagerDashboardBloc].
/// Features:
/// - Summary stats bar (Estate, Today, Manager, Efficiency)
/// - Filter tabs (Semua, Active, Alert, Maintenance)
/// - 2-column grid of company/estate cards
/// - Floating total production card at bottom
class AreaManagerMonitorTab extends StatefulWidget {
  const AreaManagerMonitorTab({super.key});

  @override
  State<AreaManagerMonitorTab> createState() => _AreaManagerMonitorTabState();
}

class _AreaManagerMonitorTabState extends State<AreaManagerMonitorTab> {
  int _selectedFilterIndex = 0;

  final List<String> _filters = ['Semua', 'Active', 'Alert', 'Maintenance'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AreaManagerTheme.scaffoldBackground,
      appBar: _buildAppBar(),
      body: BlocBuilder<AreaManagerDashboardBloc, AreaManagerDashboardState>(
        builder: (context, state) {
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
                    const Icon(Icons.error_outline,
                        size: 48, color: Colors.red),
                    const SizedBox(height: 12),
                    Text(
                      'Gagal memuat data',
                      style: AreaManagerTheme.headingMedium,
                    ),
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
        },
      ),
      bottomNavigationBar: _buildBottomNavigation(context),
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
        'Multi-Estate Monitoring',
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 18,
        ),
      ),
      centerTitle: true,
      leading: IconButton(
        icon: const Icon(Icons.filter_alt_outlined, color: Colors.white),
        onPressed: () => _showFilterDialog(context),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh, color: Colors.white),
          onPressed: () => _refreshData(context),
        ),
      ],
    );
  }

  Widget _buildBody(AreaManagerDashboardLoaded state) {
    final filtered = _getFilteredCompanies(state.companyPerformance);

    return Stack(
      children: [
        CustomScrollView(
          slivers: [
            // Summary Stats Bar — real data from BLoC
            SliverToBoxAdapter(
              child: AreaManagerMonitorSummaryBar(
                estateCount: state.stats.totalEstates,
                todayProduction: state.stats.todayProduction.toStringAsFixed(0),
                managerCount: state.managers.length,
                efficiency: '${state.stats.avgEfficiency.toStringAsFixed(1)}%',
              ),
            ),

            // Filter Tabs
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: AreaManagerMonitorFilterTabs(
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

            // Divider
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                height: 1,
                color: Colors.grey[300],
              ),
            ),

            // Company Cards Grid — real data
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              sliver: filtered.isEmpty
                  ? SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 32),
                        child: Center(
                          child: Text(
                            'Tidak ada data untuk filter ini',
                            style: AreaManagerTheme.bodyMedium,
                          ),
                        ),
                      ),
                    )
                  : SliverGrid(
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 0.65,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final cp = filtered[index];
                          return AreaManagerEstateCard(
                            estateName: cp.companyName,
                            location: '${cp.estatesCount} estate',
                            managerName: '',
                            todayProduction: cp.todayProduction,
                            efficiency: cp.efficiencyScore,
                            targetProgress:
                                cp.targetAchievement.clamp(0, 100).toDouble(),
                            isEfficiencyUp: cp.isTrendUp,
                            isActive: cp.isActive,
                            onViewDetail: () =>
                                _showEstateDetail(cp.companyName),
                          );
                        },
                        childCount: filtered.length,
                      ),
                    ),
            ),
          ],
        ),

        // Floating Total Card — real aggregated data
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: AreaManagerFloatingTotalCard(
            totalToday: state.stats.todayProduction,
            targetTon:
                state.stats.monthlyTarget > 0 ? state.stats.monthlyTarget : 1,
            targetPercentage:
                state.stats.targetAchievement.clamp(0.0, 100.0),
          ),
        ),
      ],
    );
  }

  List<CompanyPerformanceModel> _getFilteredCompanies(
      List<CompanyPerformanceModel> companies) {
    switch (_selectedFilterIndex) {
      case 0: // Semua
        return companies;
      case 1: // Active
        return companies.where((c) => c.status != 'CRITICAL').toList();
      case 2: // Alert
        return companies
            .where((c) => c.status == 'WARNING' || c.status == 'CRITICAL')
            .toList();
      case 3: // Maintenance
        return []; // No maintenance status in current schema
      default:
        return companies;
    }
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
        currentIndex: 1, // Monitoring is index 1
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
        // Already on Monitoring
        break;
      case 2:
        _showComingSoon('Reports');
        break;
      case 3:
        final bloc = context.read<AreaManagerDashboardBloc>();
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (ctx) => BlocProvider<AreaManagerDashboardBloc>.value(
              value: bloc,
              child: const AreaManagerManagersTab(),
            ),
          ),
        );
        break;
      case 4:
        _showComingSoon('Settings');
        break;
    }
  }

  void _refreshData(BuildContext context) {
    context
        .read<AreaManagerDashboardBloc>()
        .add(const AreaManagerDashboardRefreshRequested());
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Memperbarui data...'),
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
              'Filter Estates',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.location_on_outlined),
              title: const Text('By Region'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.bar_chart_outlined),
              title: const Text('By Performance'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.person_outline),
              title: const Text('By Manager'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.pop(context),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showEstateDetail(String name) {
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

