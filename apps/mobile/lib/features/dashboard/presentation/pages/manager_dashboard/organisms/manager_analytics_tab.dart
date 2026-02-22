import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../../shared/widgets/auth_listener_wrapper.dart';
import '../../../../data/models/manager_dashboard_models.dart';
import '../../../blocs/manager_dashboard_bloc.dart';
import '../manager_theme.dart';
import 'manager_monitor_tab.dart';
import 'manager_profile_tab.dart';

/// Manager Analytics Tab Page backed by ManagerDashboardBloc real data.
class ManagerAnalyticsTab extends StatefulWidget {
  const ManagerAnalyticsTab({super.key});

  @override
  State<ManagerAnalyticsTab> createState() => _ManagerAnalyticsTabState();
}

class _ManagerAnalyticsTabState extends State<ManagerAnalyticsTab> {
  int _selectedPeriodIndex = 1; // Default: WEEKLY
  final List<String> _periods = ['Harian', 'Mingguan', 'Bulanan'];
  final Map<int, String> _periodMap = const {
    0: 'DAILY',
    1: 'WEEKLY',
    2: 'MONTHLY',
  };

  @override
  Widget build(BuildContext context) {
    return AuthListenerWrapper(
      child: BlocBuilder<ManagerDashboardBloc, ManagerDashboardState>(
        builder: (context, state) {
          if (state is ManagerDashboardLoading ||
              state is ManagerDashboardInitial) {
            return _buildLoadingScaffold();
          }

          if (state is ManagerDashboardError) {
            return _buildErrorScaffold(state.message);
          }

          final loaded = state as ManagerDashboardLoaded;
          if (!loaded.isRefreshing) {
            _selectedPeriodIndex =
                _periodIndexFromValue(loaded.analytics.period);
          }

          final analytics = loaded.analytics;
          final dashboard = loaded.dashboard;

          final trendPoints = analytics.productionTrend.dataPoints;
          final comparison = analytics.comparison;
          final divisionPerformance = {
            for (final division in analytics.divisionPerformance)
              (division.divisionName.isEmpty
                  ? 'Divisi ${division.rank}'
                  : division.divisionName): division.achievement,
          };
          final qualityDistribution = analytics.qualityAnalysis.distribution;
          final efficiencyScore = analytics.efficiencyMetrics.overallScore;
          final totalMandor = dashboard.teamSummary.totalMandors;
          final totalAsisten = dashboard.teamSummary.totalAsistens;

          return Scaffold(
            backgroundColor: Colors.grey[100],
            body: CustomScrollView(
              slivers: [
                _buildSliverAppBar(),
                SliverToBoxAdapter(
                  child: Column(
                    children: [
                      _buildPeriodTabs(context),
                      if (loaded.isRefreshing)
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16),
                          child: LinearProgressIndicator(minHeight: 2),
                        ),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            _buildProductionTrendCard(trendPoints),
                            const SizedBox(height: 16),
                            _buildComparisonCards(
                              changePercentage: comparison.changePercentage,
                              targetAchievement: comparison.targetAchievement,
                            ),
                            const SizedBox(height: 16),
                            _buildDivisionAndQualityRow(
                              divisionPerformance: divisionPerformance,
                              qualityDistribution: qualityDistribution,
                            ),
                            const SizedBox(height: 16),
                            _buildEfficiencyCard(
                              efficiencyScore: efficiencyScore,
                              totalMandor: totalMandor,
                              totalAsisten: totalAsisten,
                            ),
                            const SizedBox(height: 100),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            bottomNavigationBar: _buildBottomNavigation(),
          );
        },
      ),
    );
  }

  Widget _buildSliverAppBar() {
    return SliverAppBar(
      expandedHeight: 120,
      pinned: true,
      backgroundColor: ManagerTheme.primaryPurple,
      foregroundColor: Colors.white,
      flexibleSpace: FlexibleSpaceBar(
        title: const Text(
          'Analytics Estate',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [
                ManagerTheme.primaryPurple,
                ManagerTheme.primaryPurpleDark,
              ],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
        ),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ],
    );
  }

  Widget _buildPeriodTabs(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: _periods.asMap().entries.map((entry) {
          final isSelected = entry.key == _selectedPeriodIndex;
          return Expanded(
            child: GestureDetector(
              onTap: () {
                if (_selectedPeriodIndex == entry.key) return;
                setState(() => _selectedPeriodIndex = entry.key);
                context.read<ManagerDashboardBloc>().add(
                      ManagerAnalyticsPeriodChanged(
                        period: _periodMap[entry.key] ?? 'WEEKLY',
                      ),
                    );
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  entry.value,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: isSelected
                        ? ManagerTheme.primaryPurple
                        : Colors.grey[600],
                    fontWeight:
                        isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildProductionTrendCard(List<TrendDataPointModel> trendPoints) {
    final spots = trendPoints.isNotEmpty
        ? trendPoints
            .asMap()
            .entries
            .map((entry) => FlSpot(
                  entry.key.toDouble(),
                  entry.value.value,
                ))
            .toList()
        : <FlSpot>[const FlSpot(0, 0)];
    final labels = trendPoints.isNotEmpty
        ? trendPoints.map((point) => point.label).toList()
        : <String>['-'];

    final maxPointValue = trendPoints.isEmpty
        ? 0.0
        : trendPoints.fold<double>(
            0.0,
            (maxValue, point) => math.max(maxValue, point.value),
          );
    final maxY = maxPointValue <= 0 ? 10.0 : maxPointValue * 1.2;
    final maxX = labels.length > 1 ? (labels.length - 1).toDouble() : 1.0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Tren Produksi',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 200,
            child: Stack(
              children: [
                LineChart(
                  LineChartData(
                    gridData: FlGridData(
                      show: true,
                      drawVerticalLine: false,
                      horizontalInterval: maxY / 4,
                      getDrawingHorizontalLine: (value) {
                        return FlLine(
                          color: Colors.grey[200]!,
                          strokeWidth: 1,
                        );
                      },
                    ),
                    titlesData: FlTitlesData(
                      leftTitles: AxisTitles(
                        axisNameWidget: Text(
                          'Volume (ton)',
                          style:
                              TextStyle(fontSize: 10, color: Colors.grey[600]),
                        ),
                        sideTitles: SideTitles(
                          showTitles: true,
                          interval: maxY / 4,
                          reservedSize: 40,
                          getTitlesWidget: (value, meta) {
                            return Text(
                              value.toInt().toString(),
                              style: TextStyle(
                                  fontSize: 10, color: Colors.grey[600]),
                            );
                          },
                        ),
                      ),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (value, meta) {
                            final index = value.toInt();
                            if (index >= 0 && index < labels.length) {
                              return Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Text(
                                  labels[index],
                                  style: TextStyle(
                                      fontSize: 10, color: Colors.grey[600]),
                                ),
                              );
                            }
                            return const Text('');
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
                    minX: 0,
                    maxX: maxX,
                    minY: 0,
                    maxY: maxY,
                    lineBarsData: [
                      LineChartBarData(
                        spots: spots,
                        isCurved: true,
                        color: ManagerTheme.primaryPurple,
                        barWidth: 3,
                        dotData: FlDotData(
                          show: true,
                          getDotPainter: (spot, percent, barData, index) {
                            return FlDotCirclePainter(
                              radius: index == spots.length - 1 ? 6 : 4,
                              color: ManagerTheme.primaryPurple,
                              strokeWidth: 2,
                              strokeColor: Colors.white,
                            );
                          },
                        ),
                        belowBarData: BarAreaData(
                          show: true,
                          gradient: LinearGradient(
                            colors: [
                              ManagerTheme.primaryPurple.withValues(alpha: 0.3),
                              ManagerTheme.primaryPurple.withValues(alpha: 0.0),
                            ],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Positioned(
                  right: 10,
                  top: 20,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: ManagerTheme.primaryPurple,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      trendPoints.isNotEmpty
                          ? '${trendPoints.last.value.toStringAsFixed(1)} ton'
                          : '--',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildComparisonCards({
    required double changePercentage,
    required double targetAchievement,
  }) {
    final isPositive = changePercentage >= 0;
    final changeText =
        '${isPositive ? '+' : ''}${changePercentage.toStringAsFixed(1)}%';

    return Row(
      children: [
        Expanded(
          child: _buildComparisonCard(
            title: 'vs Minggu Lalu',
            value: changeText,
            subtitle: isPositive
                ? 'Naik dari periode lalu'
                : 'Turun dari periode lalu',
            icon: isPositive ? Icons.arrow_upward : Icons.arrow_downward,
            iconColor: isPositive ? Colors.green : Colors.red,
            valueColor: isPositive ? Colors.green : Colors.red,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildComparisonCard(
            title: 'vs Target',
            value: '${targetAchievement.toStringAsFixed(1)}%',
            subtitle: 'Pencapaian target',
            icon: null,
            iconColor: null,
            valueColor: ManagerTheme.primaryPurple,
            isTarget: true,
          ),
        ),
      ],
    );
  }

  Widget _buildComparisonCard({
    required String title,
    required String value,
    required String subtitle,
    IconData? icon,
    Color? iconColor,
    required Color valueColor,
    bool isTarget = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: valueColor,
                ),
              ),
              if (icon != null) ...[
                const SizedBox(width: 8),
                Icon(icon, color: iconColor, size: 20),
              ],
            ],
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 11,
              color: isTarget ? ManagerTheme.primaryPurple : Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDivisionAndQualityRow({
    required Map<String, double> divisionPerformance,
    required List<QualityDistributionModel> qualityDistribution,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: _buildDivisionPerformanceCard(
            divisionPerformance: divisionPerformance,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildQualityDonutCard(
            qualityDistribution: qualityDistribution,
          ),
        ),
      ],
    );
  }

  Widget _buildDivisionPerformanceCard({
    required Map<String, double> divisionPerformance,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Performa per Divisi',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          if (divisionPerformance.isEmpty)
            Text(
              'Belum ada data divisi',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            )
          else
            ...divisionPerformance.entries.map((entry) {
              final value = entry.value.clamp(0, 100);
              final color = value >= 90
                  ? Colors.green
                  : value >= 80
                      ? Colors.blue
                      : value >= 70
                          ? Colors.orange
                          : Colors.red;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          entry.key,
                          style: const TextStyle(fontSize: 12),
                        ),
                        Text(
                          '${value.toStringAsFixed(1)}%',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: color,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: value / 100,
                        backgroundColor: Colors.grey[200],
                        valueColor: AlwaysStoppedAnimation<Color>(color),
                        minHeight: 6,
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildQualityDonutCard({
    required List<QualityDistributionModel> qualityDistribution,
  }) {
    final pieSections = qualityDistribution
        .map((item) => PieChartSectionData(
              value: item.percentage,
              color: _colorFromHex(item.colorCode),
              radius: 25,
              showTitle: false,
            ))
        .toList();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Analisis Kualitas',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          if (qualityDistribution.isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: qualityDistribution.map((item) {
                final color = _colorFromHex(item.colorCode);
                final percentage = item.percentage;
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${item.grade} ${percentage.toStringAsFixed(1)}%',
                      style: const TextStyle(fontSize: 9),
                    ),
                  ],
                );
              }).toList(),
            ),
          const SizedBox(height: 8),
          SizedBox(
            height: 120,
            child: Stack(
              alignment: Alignment.center,
              children: [
                PieChart(
                  PieChartData(
                    sectionsSpace: 2,
                    centerSpaceRadius: 35,
                    sections: pieSections.isEmpty
                        ? [
                            PieChartSectionData(
                              value: 100,
                              color: Colors.grey[300],
                              radius: 25,
                              showTitle: false,
                            ),
                          ]
                        : pieSections,
                  ),
                ),
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: Colors.orange[100],
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.eco,
                    color: Colors.orange[700],
                    size: 28,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEfficiencyCard({
    required double efficiencyScore,
    required int totalMandor,
    required int totalAsisten,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Efisiensi Rata-rata',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                flex: 2,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${efficiencyScore.toStringAsFixed(1)}%',
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.arrow_outward,
                          size: 16,
                          color: Colors.green,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        _buildPersonCount(
                          Icons.person,
                          'Mandor:',
                          totalMandor,
                          Colors.blue,
                        ),
                        _buildPersonCount(
                          Icons.person_outline,
                          'Asisten:',
                          totalAsisten,
                          Colors.amber,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              SizedBox(
                width: 70,
                height: 60,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _buildMiniBar(0.4, Colors.purple[200]!),
                    _buildMiniBar(0.6, Colors.purple[300]!),
                    _buildMiniBar(0.8, Colors.purple[400]!),
                    _buildMiniBar(1.0, Colors.green),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPersonCount(
      IconData icon, String label, int count, Color color) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 4),
        Text(
          '$label $count',
          style: TextStyle(fontSize: 11, color: Colors.grey[700]),
        ),
      ],
    );
  }

  Widget _buildMiniBar(double height, Color color) {
    return Container(
      width: 14,
      height: 60 * height,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(4),
      ),
    );
  }

  Widget _buildBottomNavigation() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
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
        backgroundColor: Colors.white,
        currentIndex: 2,
        selectedItemColor: ManagerTheme.primaryPurple,
        unselectedItemColor: Colors.grey[600],
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.monitor_outlined),
            label: 'Monitor',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.analytics),
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

  Widget _buildLoadingScaffold() {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        backgroundColor: ManagerTheme.primaryPurple,
        foregroundColor: Colors.white,
        title: const Text('Analytics Estate'),
      ),
      body: const Center(child: CircularProgressIndicator()),
    );
  }

  Widget _buildErrorScaffold(String message) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        backgroundColor: ManagerTheme.primaryPurple,
        foregroundColor: Colors.white,
        title: const Text('Analytics Estate'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.red),
          ),
        ),
      ),
    );
  }

  int _periodIndexFromValue(String period) {
    final normalized = period.toUpperCase();
    final entry = _periodMap.entries.firstWhere(
      (item) => item.value == normalized,
      orElse: () => const MapEntry(1, 'WEEKLY'),
    );
    return entry.key;
  }

  Color _colorFromHex(String hex) {
    final cleanHex = hex.replaceFirst('#', '');
    if (cleanHex.length != 6) {
      return Colors.grey;
    }
    return Color(int.parse('FF$cleanHex', radix: 16));
  }

  void _handleBottomNavigation(BuildContext context, int index) {
    switch (index) {
      case 0:
        Navigator.pop(context);
        break;
      case 1:
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const ManagerMonitorTab()),
        );
        break;
      case 2:
        break;
      case 3:
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const ManagerProfileTab()),
        );
        break;
    }
  }
}

