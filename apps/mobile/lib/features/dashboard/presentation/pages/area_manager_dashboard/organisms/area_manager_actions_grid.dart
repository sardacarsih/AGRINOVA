import 'package:flutter/material.dart';
import '../area_manager_theme.dart';
import '../molecules/area_manager_action_button.dart';

/// Organism: Quick Actions Grid for Area Manager
/// 2x2 grid of action buttons
class AreaManagerActionsGrid extends StatelessWidget {
  final VoidCallback? onMonitoring;
  final VoidCallback? onReporting;
  final VoidCallback? onManagerReports;
  final VoidCallback? onOversight;

  const AreaManagerActionsGrid({
    super.key,
    this.onMonitoring,
    this.onReporting,
    this.onManagerReports,
    this.onOversight,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Quick Actions', style: AreaManagerTheme.headingMedium),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: AreaManagerActionButton(
                title: 'Multi-Estate\nMonitoring',
                icon: Icons.public,
                color: AreaManagerTheme.monitoringTeal,
                onTap: onMonitoring ?? () {},
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AreaManagerActionButton(
                title: 'Estate\nReporting',
                icon: Icons.bar_chart,
                color: AreaManagerTheme.reportingOrange,
                onTap: onReporting ?? () {},
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: AreaManagerActionButton(
                title: 'Manager\nReports',
                icon: Icons.groups,
                color: AreaManagerTheme.managerReportsTan,
                onTap: onManagerReports ?? () {},
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AreaManagerActionButton(
                title: 'Cross-Estate\nOversight',
                icon: Icons.visibility,
                color: AreaManagerTheme.oversightPurple,
                onTap: onOversight ?? () {},
              ),
            ),
          ],
        ),
      ],
    );
  }
}
