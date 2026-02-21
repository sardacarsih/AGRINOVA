import 'package:flutter/material.dart';
import '../manager_theme.dart';
import '../molecules/manager_metric_card.dart';
import '../../../../data/models/manager_dashboard_models.dart';

/// Organism: Performance Grid
/// Displays estate performance metrics in a grid - "Performa Estate"
class ManagerPerformanceGrid extends StatelessWidget {
  final VoidCallback? onMetricTap;
  final ManagerDashboardStats? stats;
  final ManagerAnalyticsModel? analytics;

  const ManagerPerformanceGrid({
    Key? key,
    this.onMetricTap,
    this.stats,
    this.analytics,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final dailyProduction = stats != null
        ? '${stats!.todayProduction.toStringAsFixed(1)} ton'
        : '--';
    final targetAchievement = stats != null
        ? '${stats!.targetAchievement.toStringAsFixed(1)}%'
        : '--';
    final efficiency = analytics != null
        ? '${analytics!.efficiencyMetrics.overallScore.toStringAsFixed(1)}%'
        : '--';
    final qualityScore = analytics != null
        ? '${analytics!.qualityAnalysis.averageScore.toStringAsFixed(1)}/10'
        : '--';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Performa Estate', style: ManagerTheme.headingMedium),
        const SizedBox(height: ManagerTheme.paddingMedium),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.2,
          children: [
            ManagerMetricCard(
              title: 'Produksi Harian',
              value: dailyProduction,
              icon: Icons.agriculture,
              color: ManagerTheme.approvedGreen,
              onTap: onMetricTap,
            ),
            ManagerMetricCard(
              title: 'Target Tercapai',
              value: targetAchievement,
              icon: Icons.flag_outlined,
              color: ManagerTheme.primaryPurple,
              onTap: onMetricTap,
            ),
            ManagerMetricCard(
              title: 'Efisiensi Tim',
              value: efficiency,
              icon: Icons.groups,
              color: ManagerTheme.teamReviewTeal,
              onTap: onMetricTap,
            ),
            ManagerMetricCard(
              title: 'Kualitas TBS',
              value: qualityScore,
              icon: Icons.star,
              color: ManagerTheme.pendingOrange,
              onTap: onMetricTap,
            ),
          ],
        ),
      ],
    );
  }
}
