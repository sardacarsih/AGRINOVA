import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../../../core/routes/app_routes.dart';
import '../blocs/monitoring_bloc.dart';
import '../widgets/stats_card_widget.dart';
import '../widgets/harvest_chart_widget.dart';
import '../widgets/recent_activities_widget.dart';
import '../widgets/estate_selector_widget.dart';

class MonitoringDashboardScreen extends StatefulWidget {
  const MonitoringDashboardScreen({Key? key}) : super(key: key);

  @override
  State<MonitoringDashboardScreen> createState() =>
      _MonitoringDashboardScreenState();
}

class _MonitoringDashboardScreenState extends State<MonitoringDashboardScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  String? _selectedEstateId;
  DateTime _selectedDate = DateTime.now();
  String _selectedPeriod = 'TODAY';

  final List<String> _periods = ['TODAY', 'WEEK', 'MONTH', 'YEAR'];
  final Map<String, String> _periodLabels = {
    'TODAY': 'Hari Ini',
    'WEEK': 'Minggu Ini',
    'MONTH': 'Bulan Ini',
    'YEAR': 'Tahun Ini',
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadDashboardData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _loadDashboardData() {
    context.read<MonitoringBloc>().add(
          MonitoringDataRequested(
            estateId: _selectedEstateId,
            period: _selectedPeriod,
            date: _selectedDate,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard Monitoring'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDashboardData,
          ),
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Overview', icon: Icon(Icons.dashboard)),
            Tab(text: 'Analitik', icon: Icon(Icons.analytics)),
            Tab(text: 'Aktivitas', icon: Icon(Icons.timeline)),
          ],
        ),
      ),
      body: BlocConsumer<MonitoringBloc, MonitoringState>(
        listener: (context, state) {
          if (state is MonitoringError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: Colors.red,
              ),
            );
          }
        },
        builder: (context, state) {
          return Column(
            children: [
              _buildFilterBar(),
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOverviewTab(state),
                    _buildAnalyticsTab(state),
                    _buildActivitiesTab(state),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildFilterBar() {
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            spreadRadius: 1,
            blurRadius: 3,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _periods.map((period) {
                  final isSelected = _selectedPeriod == period;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(_periodLabels[period]!),
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected) {
                          setState(() {
                            _selectedPeriod = period;
                          });
                          _loadDashboardData();
                        }
                      },
                      selectedColor: Theme.of(context)
                          .colorScheme
                          .primary
                          .withOpacity(0.2),
                      checkmarkColor: Theme.of(context).colorScheme.primary,
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewTab(MonitoringState state) {
    if (state is MonitoringLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state is MonitoringLoaded) {
      return RefreshIndicator(
        onRefresh: () async => _loadDashboardData(),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildStatsGrid(state.stats),
              const SizedBox(height: 24),
              _buildQuickActions(),
              const SizedBox(height: 24),
              _buildRecentSummary(state),
            ],
          ),
        ),
      );
    }

    return _buildErrorState();
  }

  Widget _buildAnalyticsTab(MonitoringState state) {
    if (state is MonitoringLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state is MonitoringLoaded) {
      return RefreshIndicator(
        onRefresh: () async => _loadDashboardData(),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              HarvestChartWidget(
                chartData: state.chartData,
                period: _selectedPeriod,
              ),
              const SizedBox(height: 24),
              _buildProductivityChart(state),
              const SizedBox(height: 24),
              _buildEstateComparison(state),
            ],
          ),
        ),
      );
    }

    return _buildErrorState();
  }

  Widget _buildActivitiesTab(MonitoringState state) {
    if (state is MonitoringLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state is MonitoringLoaded) {
      return RefreshIndicator(
        onRefresh: () async => _loadDashboardData(),
        child: RecentActivitiesWidget(
          activities: state.recentActivities,
          estateId: _selectedEstateId,
        ),
      );
    }

    return _buildErrorState();
  }

  Widget _buildStatsGrid(Map<String, dynamic> stats) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.5,
      children: [
        StatsCardWidget(
          title: 'Total Panen',
          value: '${stats['totalHarvest']?.toStringAsFixed(1) ?? '0'} ton',
          icon: Icons.agriculture,
          color: Colors.green,
          trend: stats['harvestTrend'],
        ),
        StatsCardWidget(
          title: 'Pending Approval',
          value: '${stats['pendingApproval'] ?? 0}',
          icon: Icons.pending_actions,
          color: Colors.orange,
          trend: stats['approvalTrend'],
        ),
        StatsCardWidget(
          title: 'Gate Check',
          value: '${stats['gateCheckCount'] ?? 0} truck',
          icon: Icons.local_shipping,
          color: Colors.blue,
          trend: stats['gateCheckTrend'],
        ),
        StatsCardWidget(
          title: 'Produktivitas',
          value: '${stats['productivity']?.toStringAsFixed(1) ?? '0'}%',
          icon: Icons.trending_up,
          color: Colors.purple,
          trend: stats['productivityTrend'],
        ),
      ],
    );
  }

  Widget _buildQuickActions() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Quick Actions',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildActionButton(
                    icon: Icons.assignment,
                    label: 'Approval',
                    onTap: () => Navigator.pushNamed(
                      context,
                      AppRoutes.asisten,
                      arguments: const {'tab': 1},
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildActionButton(
                    icon: Icons.bar_chart,
                    label: 'Report',
                    onTap: () => Navigator.pushNamed(context, '/reports'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildActionButton(
                    icon: Icons.settings,
                    label: 'Settings',
                    onTap: () => Navigator.pushNamed(context, '/settings'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey[200]!),
        ),
        child: Column(
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentSummary(MonitoringLoaded state) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Ringkasan Hari Ini',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            _buildSummaryRow(
              'Panen Masuk',
              '${state.todayStats['newHarvests'] ?? 0} entri',
              Icons.add_circle,
              Colors.green,
            ),
            _buildSummaryRow(
              'Disetujui',
              '${state.todayStats['approved'] ?? 0} entri',
              Icons.check_circle,
              Colors.blue,
            ),
            _buildSummaryRow(
              'Ditolak',
              '${state.todayStats['rejected'] ?? 0} entri',
              Icons.cancel,
              Colors.red,
            ),
            _buildSummaryRow(
              'Truck Masuk',
              '${state.todayStats['trucksIn'] ?? 0} truck',
              Icons.login,
              Colors.orange,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(
      String title, String value, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductivityChart(MonitoringLoaded state) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Produktivitas per Blok',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: 100,
                  barTouchData: BarTouchData(enabled: false),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final blocks = ['A1', 'A2', 'B1', 'B2', 'C1'];
                          if (value.toInt() < blocks.length) {
                            return Text(blocks[value.toInt()]);
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          return Text('${value.toInt()}%');
                        },
                      ),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: [
                    BarChartGroupData(x: 0, barRods: [
                      BarChartRodData(toY: 85, color: Colors.green)
                    ]),
                    BarChartGroupData(x: 1, barRods: [
                      BarChartRodData(toY: 92, color: Colors.green)
                    ]),
                    BarChartGroupData(x: 2, barRods: [
                      BarChartRodData(toY: 78, color: Colors.orange)
                    ]),
                    BarChartGroupData(x: 3, barRods: [
                      BarChartRodData(toY: 95, color: Colors.green)
                    ]),
                    BarChartGroupData(x: 4, barRods: [
                      BarChartRodData(toY: 88, color: Colors.green)
                    ]),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEstateComparison(MonitoringLoaded state) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Perbandingan Estate',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            ...state.estateComparison.map((estate) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(
                        estate['name'],
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: LinearProgressIndicator(
                        value: estate['percentage'] / 100,
                        backgroundColor: Colors.grey[200],
                        valueColor: AlwaysStoppedAnimation<Color>(
                          estate['percentage'] > 80
                              ? Colors.green
                              : estate['percentage'] > 60
                                  ? Colors.orange
                                  : Colors.red,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${estate['percentage'].toStringAsFixed(1)}%',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.red[400],
          ),
          const SizedBox(height: 16),
          const Text('Terjadi kesalahan saat memuat data'),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadDashboardData,
            child: const Text('Coba Lagi'),
          ),
        ],
      ),
    );
  }

  void _showFilterDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => EstateSelectors(
        selectedEstateId: _selectedEstateId,
        selectedDate: _selectedDate,
        onEstateChanged: (estateId) {
          setState(() => _selectedEstateId = estateId);
        },
        onDateChanged: (date) {
          setState(() => _selectedDate = date);
        },
        onApply: () {
          Navigator.pop(context);
          _loadDashboardData();
        },
      ),
    );
  }
}
