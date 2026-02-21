import 'package:flutter/material.dart';
import '../asisten_theme.dart';
import '../molecules/asisten_metric_card.dart';

/// Organism: Stats Grid
/// Displays key metrics in a grid
class AsistenStatsGrid extends StatelessWidget {
  final int pendingApprovalCount;
  final int approvedTodayCount;
  final int totalPendingTbs;
  final int activeMandorCount;
  final VoidCallback? onMetricTap;

  const AsistenStatsGrid({
    super.key,
    required this.pendingApprovalCount,
    required this.approvedTodayCount,
    required this.totalPendingTbs,
    required this.activeMandorCount,
    this.onMetricTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Ringkasan Hari Ini', style: AsistenTheme.headingMedium),
        const SizedBox(height: AsistenTheme.paddingMedium),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.2,
          children: [
            AsistenMetricCard(
              title: 'Pending Approval',
              value: pendingApprovalCount.toString(),
              icon: Icons.pending_actions,
              color: AsistenTheme.pendingOrange,
              isPositive: false,
              onTap: onMetricTap,
            ),
            AsistenMetricCard(
              title: 'Approved Today',
              value: approvedTodayCount.toString(),
              icon: Icons.check_circle_outline,
              color: AsistenTheme.approvedGreen,
              isPositive: true,
              onTap: onMetricTap,
            ),
            AsistenMetricCard(
              title: 'Total TBS Pending',
              value: '$totalPendingTbs jjg',
              icon: Icons.agriculture,
              color: AsistenTheme.primaryBlue,
              isPositive: true,
              onTap: onMetricTap,
            ),
            AsistenMetricCard(
              title: 'Mandor Aktif',
              value: activeMandorCount.toString(),
              icon: Icons.groups,
              color: AsistenTheme.qualityCheckTeal,
              onTap: onMetricTap,
            ),
          ],
        ),
      ],
    );
  }
}
