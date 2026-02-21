import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter/material.dart';

import '../../../../../approval/domain/entities/approval_item.dart';
import '../../../../../monitoring/data/repositories/monitoring_repository.dart';
import '../../../../../monitoring/presentation/blocs/monitoring_bloc.dart';
import '../asisten_theme.dart';

/// Asisten Monitoring Tab - "Monitoring Divisi"
///
/// Features:
/// - Real monitoring data from backend approval records
/// - Daily/weekly/monthly trend charts
/// - Summary statistics and approval quality indicators
/// - Top block and top mandor performance ranking
class AsistenMonitoringTab extends StatefulWidget {
  const AsistenMonitoringTab({super.key});

  @override
  State<AsistenMonitoringTab> createState() => _AsistenMonitoringTabState();
}

class _AsistenMonitoringTabState extends State<AsistenMonitoringTab> {
  int _selectedPeriodIndex = 0; // 0: Hari Ini, 1: Minggu Ini, 2: Bulan Ini
  DateTime _selectedMonth = DateTime.now();

  bool _isLoading = true;
  String? _errorMessage;
  _MonitoringViewData _viewData = _MonitoringViewData.empty();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _requestMonitoring();
      }
    });
  }

  String get _selectedPeriodCode {
    switch (_selectedPeriodIndex) {
      case 0:
        return 'TODAY';
      case 1:
        return 'WEEK';
      default:
        return 'MONTH';
    }
  }

  DateTime get _requestDate {
    if (_selectedPeriodIndex == 2) {
      return DateTime(_selectedMonth.year, _selectedMonth.month, 1);
    }
    return DateTime.now();
  }

  void _requestMonitoring({bool showLoader = true}) {
    context.read<MonitoringBloc>().add(
          MonitoringDataRequested(
            period: _selectedPeriodCode,
            date: _requestDate,
            showLoader: showLoader,
          ),
        );
  }

  void _consumeBlocState(MonitoringState state) {
    if (state is MonitoringLoading) {
      if (!state.showLoader) {
        return;
      }
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
      return;
    }

    if (state is MonitoringLoaded) {
      final range = _resolveDateRange();
      setState(() {
        _viewData = _buildViewData(
          range: range,
          pendingItems: state.pendingItems,
          approvedItems: state.approvedItems,
          rejectedItems: state.rejectedItems,
          monitoringSnapshot: state.asistenSnapshot,
        );
        _isLoading = false;
        _errorMessage = null;
      });
      return;
    }

    if (state is MonitoringError) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Gagal memuat data monitoring: ${state.message}';
      });
    }
  }

  _DateRange _resolveDateRange() {
    final now = DateTime.now();

    if (_selectedPeriodIndex == 0) {
      final start = DateTime(now.year, now.month, now.day);
      return _DateRange(
        type: _PeriodType.today,
        start: start,
        endExclusive: start.add(const Duration(days: 1)),
      );
    }

    if (_selectedPeriodIndex == 1) {
      final dayStart = DateTime(now.year, now.month, now.day);
      final weekStart = dayStart.subtract(Duration(days: now.weekday - 1));
      return _DateRange(
        type: _PeriodType.week,
        start: weekStart,
        endExclusive: weekStart.add(const Duration(days: 7)),
      );
    }

    final monthStart = DateTime(_selectedMonth.year, _selectedMonth.month, 1);
    final monthEndExclusive =
        DateTime(_selectedMonth.year, _selectedMonth.month + 1, 1);

    return _DateRange(
      type: _PeriodType.month,
      start: monthStart,
      endExclusive: monthEndExclusive,
    );
  }

  _MonitoringViewData _buildViewData({
    required _DateRange range,
    required List<ApprovalItem> pendingItems,
    required List<ApprovalItem> approvedItems,
    required List<ApprovalItem> rejectedItems,
    AsistenMonitoringSnapshot? monitoringSnapshot,
  }) {
    final allItems = [...pendingItems, ...approvedItems, ...rejectedItems]
      ..sort((a, b) => b.submittedAt.compareTo(a.submittedAt));

    var totalSubmissions = allItems.length;
    var totalVolumeTon = allItems.fold<double>(
      0,
      (sum, item) => sum + _weightKgToTon(item.weight),
    );
    var totalTbs = allItems.fold<int>(0, (sum, item) => sum + item.tbsCount);
    var blockPerformance = _buildBlockPerformance(allItems);
    var topMandors = _buildTopMandors(allItems);

    if (range.type == _PeriodType.today && monitoringSnapshot != null) {
      if (totalSubmissions == 0 &&
          monitoringSnapshot.totalSubmissionsToday > 0) {
        totalSubmissions = monitoringSnapshot.totalSubmissionsToday;
      }
      if (totalTbs == 0 && monitoringSnapshot.totalTbsToday > 0) {
        totalTbs = monitoringSnapshot.totalTbsToday;
      }
      if (totalVolumeTon == 0 && monitoringSnapshot.totalWeightToday > 0) {
        totalVolumeTon = _weightKgToTon(monitoringSnapshot.totalWeightToday);
      }

      if (monitoringSnapshot.divisionSummaries.isNotEmpty) {
        blockPerformance = monitoringSnapshot.divisionSummaries
            .map(
              (summary) => _BlockPerformanceItem(
                blockName: summary.divisionName,
                percentage: summary.progress.clamp(0, 100).toDouble(),
              ),
            )
            .take(6)
            .toList(growable: false);
      }

      if (monitoringSnapshot.mandorStatuses.isNotEmpty) {
        topMandors = monitoringSnapshot.mandorStatuses.map((status) {
          final rate = status.todaySubmissions > 0
              ? (status.approvedSubmissions / status.todaySubmissions) * 100
              : 0.0;
          return _MandorRanking(
            name: status.mandorName,
            volumeTon: _weightKgToTon(status.todayWeight),
            approvalRate: rate,
          );
        }).toList();
        topMandors.sort((a, b) => b.volumeTon.compareTo(a.volumeTon));
        topMandors = topMandors.take(5).toList(growable: false);
      }
    }

    final averageTon =
        totalSubmissions > 0 ? totalVolumeTon / totalSubmissions : 0.0;
    final approvalRate = totalSubmissions > 0
        ? (approvedItems.length / totalSubmissions) * 100
        : 0.0;

    return _MonitoringViewData(
      totalSubmissions: totalSubmissions,
      totalVolumeTon: totalVolumeTon,
      averageTon: averageTon,
      approvalRate: approvalRate,
      totalTbs: totalTbs,
      chartPoints: _buildChartPoints(range, allItems),
      blockPerformance: blockPerformance,
      topMandors: topMandors,
    );
  }

  List<_ChartPoint> _buildChartPoints(
      _DateRange range, List<ApprovalItem> items) {
    if (range.type == _PeriodType.today) {
      return List.generate(8, (index) {
        final bucketStart = range.start.add(Duration(hours: index * 3));
        final bucketEnd = bucketStart.add(const Duration(hours: 3));
        return _ChartPoint(
          label: bucketStart.hour.toString().padLeft(2, '0'),
          valueTon: _sumWeightInRange(items, bucketStart, bucketEnd),
        );
      });
    }

    if (range.type == _PeriodType.week) {
      return List.generate(7, (index) {
        final bucketStart = range.start.add(Duration(days: index));
        final bucketEnd = bucketStart.add(const Duration(days: 1));
        return _ChartPoint(
          label: _weekdayShort(bucketStart.weekday),
          valueTon: _sumWeightInRange(items, bucketStart, bucketEnd),
        );
      });
    }

    final points = <_ChartPoint>[];
    var bucketStart = range.start;
    var weekIndex = 1;

    while (bucketStart.isBefore(range.endExclusive)) {
      final rawEnd = bucketStart.add(const Duration(days: 7));
      final bucketEnd =
          rawEnd.isBefore(range.endExclusive) ? rawEnd : range.endExclusive;

      points.add(_ChartPoint(
        label: 'M$weekIndex',
        valueTon: _sumWeightInRange(items, bucketStart, bucketEnd),
      ));

      weekIndex += 1;
      bucketStart = bucketEnd;
    }

    return points;
  }

  List<_BlockPerformanceItem> _buildBlockPerformance(List<ApprovalItem> items) {
    final grouped = <String, double>{};

    for (final item in items) {
      final blockName = item.blockName.trim();
      if (blockName.isEmpty) {
        continue;
      }
      grouped[blockName] =
          (grouped[blockName] ?? 0) + _weightKgToTon(item.weight);
    }

    if (grouped.isEmpty) {
      return const [];
    }

    var maxVolume = 0.0;
    for (final value in grouped.values) {
      if (value > maxVolume) {
        maxVolume = value;
      }
    }
    final rows = grouped.entries.map((entry) {
      final percent = maxVolume <= 0 ? 0.0 : (entry.value / maxVolume) * 100;
      return _BlockPerformanceItem(
        blockName: entry.key,
        percentage: percent,
      );
    }).toList();

    rows.sort((a, b) => b.percentage.compareTo(a.percentage));
    return rows.take(6).toList(growable: false);
  }

  List<_MandorRanking> _buildTopMandors(List<ApprovalItem> items) {
    final grouped = <String, _MandorAggregate>{};

    for (final item in items) {
      final mapKey = item.mandorId.trim().isNotEmpty
          ? item.mandorId.trim()
          : item.mandorName.trim();
      if (mapKey.isEmpty) {
        continue;
      }

      final aggregate = grouped.putIfAbsent(
        mapKey,
        () => _MandorAggregate(
          name: item.mandorName.trim().isNotEmpty
              ? item.mandorName.trim()
              : 'Tanpa Nama',
        ),
      );

      aggregate.total += 1;
      aggregate.totalTon += _weightKgToTon(item.weight);
      if (item.status == 'APPROVED') {
        aggregate.approved += 1;
      }
    }

    final ranking = grouped.values.map((agg) {
      final rate = agg.total > 0 ? (agg.approved / agg.total) * 100 : 0.0;
      return _MandorRanking(
        name: agg.name,
        volumeTon: agg.totalTon,
        approvalRate: rate,
      );
    }).toList();

    ranking.sort((a, b) {
      final byVolume = b.volumeTon.compareTo(a.volumeTon);
      if (byVolume != 0) {
        return byVolume;
      }
      return b.approvalRate.compareTo(a.approvalRate);
    });

    return ranking.take(5).toList(growable: false);
  }

  double _sumWeightInRange(
    List<ApprovalItem> items,
    DateTime start,
    DateTime endExclusive,
  ) {
    var total = 0.0;
    for (final item in items) {
      if (!item.submittedAt.isBefore(start) &&
          item.submittedAt.isBefore(endExclusive)) {
        total += _weightKgToTon(item.weight);
      }
    }
    return total;
  }

  double _weightKgToTon(double kg) => kg / 1000;

  String _weekdayShort(int weekday) {
    const labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    return labels[weekday - 1];
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<MonitoringBloc, MonitoringState>(
      listener: (context, state) => _consumeBlocState(state),
      child: RefreshIndicator(
        onRefresh: () async => _requestMonitoring(showLoader: false),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            _buildSliverAppBar(),
            SliverToBoxAdapter(
              child: Column(
                children: [
                  _buildPeriodFilterTabs(),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: _buildBody(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading && _viewData.totalSubmissions == 0) {
      return const SizedBox(
        height: 320,
        child: Center(child: CircularProgressIndicator()),
      );
    }

    if (_errorMessage != null && _viewData.totalSubmissions == 0) {
      return SizedBox(
        height: 320,
        child: _buildErrorState(),
      );
    }

    return Column(
      children: [
        if (_errorMessage != null) ...[
          _buildWarningBanner(_errorMessage!),
          const SizedBox(height: 16),
        ],
        _buildTrendChart(),
        const SizedBox(height: 16),
        _buildSummaryCards(),
        const SizedBox(height: 16),
        _buildBlockPerformanceWidget(),
        const SizedBox(height: 16),
        _buildTopMandorTable(),
        const SizedBox(height: 100),
      ],
    );
  }

  Widget _buildSliverAppBar() {
    return SliverAppBar(
      expandedHeight: 120,
      pinned: true,
      automaticallyImplyLeading: false,
      backgroundColor: AsistenTheme.primaryBlue,
      flexibleSpace: FlexibleSpaceBar(
        title: const Text(
          'Monitoring Divisi',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        background: Container(
          decoration: const BoxDecoration(
            gradient: AsistenTheme.headerGradient,
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.only(left: 16, top: 8),
              child: Align(
                alignment: Alignment.topLeft,
                child: _buildDateSelector(),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDateSelector() {
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember'
    ];
    final monthName = months[_selectedMonth.month - 1];

    return GestureDetector(
      onTap: _showMonthPicker,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.calendar_today, color: Colors.grey[600], size: 16),
            const SizedBox(width: 8),
            Text(
              '$monthName ${_selectedMonth.year}',
              style: TextStyle(
                color: Colors.grey[800],
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
            ),
            const SizedBox(width: 4),
            Icon(Icons.keyboard_arrow_down, color: Colors.grey[600], size: 20),
          ],
        ),
      ),
    );
  }

  void _showMonthPicker() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(20),
          height: 300,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Pilih Bulan',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    childAspectRatio: 2,
                    crossAxisSpacing: 8,
                    mainAxisSpacing: 8,
                  ),
                  itemCount: 12,
                  itemBuilder: (context, index) {
                    const shortMonths = [
                      'Jan',
                      'Feb',
                      'Mar',
                      'Apr',
                      'Mei',
                      'Jun',
                      'Jul',
                      'Agu',
                      'Sep',
                      'Okt',
                      'Nov',
                      'Des'
                    ];

                    final isSelected = index + 1 == _selectedMonth.month;

                    return InkWell(
                      onTap: () {
                        setState(() {
                          _selectedMonth =
                              DateTime(_selectedMonth.year, index + 1);
                        });
                        Navigator.pop(context);
                        if (_selectedPeriodIndex == 2) {
                          _requestMonitoring();
                        }
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AsistenTheme.primaryBlue
                              : Colors.grey[100],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          shortMonths[index],
                          style: TextStyle(
                            color: isSelected ? Colors.white : Colors.grey[800],
                            fontWeight: isSelected
                                ? FontWeight.bold
                                : FontWeight.normal,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPeriodFilterTabs() {
    const periods = ['Hari Ini', 'Minggu Ini', 'Bulan Ini'];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: const BoxDecoration(
        gradient: AsistenTheme.headerGradient,
      ),
      child: Row(
        children: periods.asMap().entries.map((entry) {
          final isSelected = entry.key == _selectedPeriodIndex;
          return Expanded(
            child: Padding(
              padding: EdgeInsets.only(
                left: entry.key == 0 ? 0 : 6,
                right: entry.key == periods.length - 1 ? 0 : 6,
              ),
              child: GestureDetector(
                onTap: () {
                  setState(() => _selectedPeriodIndex = entry.key);
                  _requestMonitoring();
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.white : Colors.transparent,
                    borderRadius: BorderRadius.circular(25),
                    border: Border.all(
                      color: Colors.white,
                      width: 1.5,
                    ),
                  ),
                  child: Text(
                    entry.value,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color:
                          isSelected ? AsistenTheme.primaryBlue : Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTrendChart() {
    final points = _viewData.chartPoints;
    final maxY = _resolveChartMaxY(points);
    final latestTon = points.isEmpty ? 0.0 : points.last.valueTon;

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
            'Tren Panen',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AsistenTheme.primaryBlue,
            ),
          ),
          const SizedBox(height: 20),
          if (points.isEmpty)
            SizedBox(
              height: 200,
              child: Center(
                child: Text(
                  'Belum ada data pada periode ini',
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ),
            )
          else
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
                            style: TextStyle(
                                fontSize: 10, color: Colors.grey[600]),
                          ),
                          sideTitles: SideTitles(
                            showTitles: true,
                            interval: maxY / 4,
                            reservedSize: 35,
                            getTitlesWidget: (value, meta) {
                              return Text(
                                value.toStringAsFixed(1),
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
                              if (index >= 0 && index < points.length) {
                                if (points.length > 8 && index.isOdd) {
                                  return const SizedBox.shrink();
                                }
                                final isLast = index == points.length - 1;
                                return Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Text(
                                    points[index].label,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isLast
                                          ? Colors.black
                                          : Colors.grey[600],
                                      fontWeight: isLast
                                          ? FontWeight.bold
                                          : FontWeight.normal,
                                    ),
                                  ),
                                );
                              }
                              return const Text('');
                            },
                          ),
                        ),
                        rightTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false)),
                        topTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false)),
                      ),
                      borderData: FlBorderData(show: false),
                      minX: 0,
                      maxX: points.length > 1
                          ? (points.length - 1).toDouble()
                          : 1,
                      minY: 0,
                      maxY: maxY,
                      lineBarsData: [
                        LineChartBarData(
                          spots: points
                              .asMap()
                              .entries
                              .map((entry) => FlSpot(
                                  entry.key.toDouble(), entry.value.valueTon))
                              .toList(),
                          isCurved: true,
                          color: AsistenTheme.primaryBlue,
                          barWidth: 3,
                          dotData: FlDotData(
                            show: true,
                            getDotPainter: (spot, percent, barData, index) {
                              final isHighlighted = index == points.length - 1;
                              return FlDotCirclePainter(
                                radius: isHighlighted ? 6 : 4,
                                color: Colors.white,
                                strokeWidth: isHighlighted ? 3 : 2,
                                strokeColor: AsistenTheme.primaryBlue,
                              );
                            },
                          ),
                          belowBarData: BarAreaData(
                            show: true,
                            gradient: LinearGradient(
                              colors: [
                                AsistenTheme.primaryBlue.withValues(alpha: 0.3),
                                AsistenTheme.primaryBlue
                                    .withValues(alpha: 0.05),
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
                    right: 60,
                    top: 30,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AsistenTheme.primaryBlue,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Text(
                        '${latestTon.toStringAsFixed(1)} ton',
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

  double _resolveChartMaxY(List<_ChartPoint> points) {
    if (points.isEmpty) {
      return 5;
    }

    var maxValue = 0.0;
    for (final point in points) {
      if (point.valueTon > maxValue) {
        maxValue = point.valueTon;
      }
    }
    if (maxValue <= 0) {
      return 5;
    }

    return (maxValue * 1.2).clamp(5, 99999);
  }

  Widget _buildSummaryCards() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          _buildStatCard(
            _viewData.totalVolumeTon.toStringAsFixed(1),
            'ton',
            'Total Volume',
            AsistenTheme.primaryBlue,
          ),
          _buildDivider(),
          _buildStatCard(
            _viewData.averageTon.toStringAsFixed(1),
            'ton',
            'Rata-rata',
            AsistenTheme.primaryBlue,
          ),
          _buildDivider(),
          _buildStatCard(
            _viewData.approvalRate.toStringAsFixed(1),
            '%',
            'Approval Rate',
            AsistenTheme.approvedGreen,
          ),
          _buildDivider(),
          _buildStatCard(
            _viewData.totalTbs.toString(),
            '',
            'Total TBS',
            AsistenTheme.primaryBlue,
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String value, String unit, String label, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        child: Column(
          children: [
            RichText(
              textAlign: TextAlign.center,
              text: TextSpan(
                children: [
                  TextSpan(
                    text: value,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                  if (unit.isNotEmpty)
                    TextSpan(
                      text: ' $unit',
                      style: TextStyle(
                        fontSize: 12,
                        color: color,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 40,
      color: Colors.grey[200],
    );
  }

  Widget _buildBlockPerformanceWidget() {
    final items = _viewData.blockPerformance;

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
            'Performa per Blok',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AsistenTheme.primaryBlue,
            ),
          ),
          const SizedBox(height: 16),
          if (items.isEmpty)
            Text(
              'Belum ada data performa blok pada periode ini',
              style: TextStyle(color: Colors.grey[600]),
            )
          else
            ...items.map((item) {
              Color barColor;
              if (item.percentage >= 85) {
                barColor = AsistenTheme.approvedGreen;
              } else if (item.percentage >= 70) {
                barColor = AsistenTheme.primaryBlue;
              } else {
                barColor = AsistenTheme.pendingOrange;
              }

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    SizedBox(
                      width: 86,
                      child: Text(
                        item.blockName,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: item.percentage / 100,
                          backgroundColor: Colors.grey[200],
                          valueColor: AlwaysStoppedAnimation<Color>(barColor),
                          minHeight: 10,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    SizedBox(
                      width: 42,
                      child: Text(
                        '${item.percentage.toInt()}%',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[700],
                        ),
                        textAlign: TextAlign.right,
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

  Widget _buildTopMandorTable() {
    final mandors = _viewData.topMandors;

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
            'Top 5 Mandor',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AsistenTheme.primaryBlue,
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Colors.grey[200]!),
              ),
            ),
            child: Row(
              children: [
                SizedBox(
                  width: 40,
                  child: Text(
                    'Rank',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[600],
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    'Nama',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[600],
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    'Volume',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[600],
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                Expanded(
                  child: Text(
                    'Approval',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[600],
                    ),
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),
          ),
          if (mandors.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Text(
                'Belum ada data mandor pada periode ini',
                style: TextStyle(color: Colors.grey[600]),
              ),
            )
          else
            ...mandors.asMap().entries.map(
                  (entry) => _buildMandorRow(
                    rank: entry.key + 1,
                    item: entry.value,
                  ),
                ),
        ],
      ),
    );
  }

  Widget _buildMandorRow({required int rank, required _MandorRanking item}) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Colors.grey[100]!),
        ),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 40,
            child: Text(
              rank.toString(),
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              item.name,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              '${item.volumeTon.toStringAsFixed(1)} ton',
              style: const TextStyle(fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ),
          Expanded(
            child: Text(
              '${item.approvalRate.toStringAsFixed(1)}%',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AsistenTheme.approvedGreen,
              ),
              textAlign: TextAlign.right,
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
        color: AsistenTheme.pendingOrange.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: AsistenTheme.pendingOrange.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.warning_amber_rounded,
            size: 18,
            color: AsistenTheme.pendingOrange,
          ),
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

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_off_rounded,
                size: 56, color: AsistenTheme.textMuted),
            const SizedBox(height: 10),
            Text(
              'Monitoring gagal dimuat',
              style: AsistenTheme.headingMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              _errorMessage ?? 'Terjadi kesalahan',
              style: AsistenTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 14),
            ElevatedButton.icon(
              onPressed: _requestMonitoring,
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
}

enum _PeriodType { today, week, month }

class _DateRange {
  final _PeriodType type;
  final DateTime start;
  final DateTime endExclusive;

  const _DateRange({
    required this.type,
    required this.start,
    required this.endExclusive,
  });
}

class _MonitoringViewData {
  final int totalSubmissions;
  final double totalVolumeTon;
  final double averageTon;
  final double approvalRate;
  final int totalTbs;
  final List<_ChartPoint> chartPoints;
  final List<_BlockPerformanceItem> blockPerformance;
  final List<_MandorRanking> topMandors;

  const _MonitoringViewData({
    required this.totalSubmissions,
    required this.totalVolumeTon,
    required this.averageTon,
    required this.approvalRate,
    required this.totalTbs,
    required this.chartPoints,
    required this.blockPerformance,
    required this.topMandors,
  });

  factory _MonitoringViewData.empty() {
    return const _MonitoringViewData(
      totalSubmissions: 0,
      totalVolumeTon: 0,
      averageTon: 0,
      approvalRate: 0,
      totalTbs: 0,
      chartPoints: [],
      blockPerformance: [],
      topMandors: [],
    );
  }
}

class _ChartPoint {
  final String label;
  final double valueTon;

  const _ChartPoint({
    required this.label,
    required this.valueTon,
  });
}

class _BlockPerformanceItem {
  final String blockName;
  final double percentage;

  const _BlockPerformanceItem({
    required this.blockName,
    required this.percentage,
  });
}

class _MandorRanking {
  final String name;
  final double volumeTon;
  final double approvalRate;

  const _MandorRanking({
    required this.name,
    required this.volumeTon,
    required this.approvalRate,
  });
}

class _MandorAggregate {
  final String name;
  int total = 0;
  int approved = 0;
  double totalTon = 0;

  _MandorAggregate({
    required this.name,
  });
}
