import 'package:flutter/material.dart';
import '../manager_theme.dart';
import '../molecules/manager_action_button.dart';

/// Organism: Actions Grid
/// Quick action buttons for manager functions - "Aksi Manajemen"
class ManagerActionsGrid extends StatelessWidget {
  final VoidCallback? onMonitoring;
  final VoidCallback? onTeamReview;
  final VoidCallback? onReports;
  final VoidCallback? onPlanning;
  final VoidCallback? onAnalytics;
  final VoidCallback? onSettings;

  const ManagerActionsGrid({
    Key? key,
    this.onMonitoring,
    this.onTeamReview,
    this.onReports,
    this.onPlanning,
    this.onAnalytics,
    this.onSettings,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Aksi Manajemen', style: ManagerTheme.headingMedium),
        const SizedBox(height: ManagerTheme.paddingMedium),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 3,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 0.95,
          children: [
            ManagerActionButton(
              title: 'Monitoring',
              icon: Icons.desktop_windows_outlined,
              color: ManagerTheme.monitoringPurple,
              onTap: onMonitoring ?? () {},
            ),
            ManagerActionButton(
              title: 'Tim Review',
              icon: Icons.groups_outlined,
              color: ManagerTheme.teamReviewTeal,
              onTap: onTeamReview ?? () {},
            ),
            ManagerActionButton(
              title: 'Laporan',
              icon: Icons.description_outlined,
              color: ManagerTheme.laporanOrange,
              onTap: onReports ?? () {},
            ),
            ManagerActionButton(
              title: 'Planning',
              icon: Icons.calendar_today_outlined,
              color: ManagerTheme.planningOrange,
              onTap: onPlanning ?? () {},
            ),
            ManagerActionButton(
              title: 'Analytics',
              icon: Icons.bar_chart,
              color: ManagerTheme.analyticsBlue,
              onTap: onAnalytics ?? () {},
            ),
            ManagerActionButton(
              title: 'Settings',
              icon: Icons.settings_outlined,
              color: ManagerTheme.settingsGray,
              onTap: onSettings ?? () {},
            ),
          ],
        ),
      ],
    );
  }
}
