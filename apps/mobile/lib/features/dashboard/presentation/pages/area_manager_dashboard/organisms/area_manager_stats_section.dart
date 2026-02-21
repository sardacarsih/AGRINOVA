import 'package:flutter/material.dart';
import '../area_manager_theme.dart';
import '../molecules/area_manager_stat_card.dart';

/// Organism: Estate Statistics Section for Area Manager
/// 2x2 grid of statistics cards
class AreaManagerStatsSection extends StatelessWidget {
  final int totalEstates;
  final int activeManagers;
  final int pendingApprovals;
  final String todayHarvest;

  const AreaManagerStatsSection({
    super.key,
    this.totalEstates = 12,
    this.activeManagers = 45,
    this.pendingApprovals = 8,
    this.todayHarvest = '1,247 ton',
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Estate Statistics', style: AreaManagerTheme.headingMedium),
        const SizedBox(height: 12),
        // First row
        Row(
          children: [
            Expanded(
              child: AreaManagerStatCard(
                title: 'Total Estates',
                value: totalEstates.toString(),
                icon: Icons.business,
                borderColor: AreaManagerTheme.infoBlue,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AreaManagerStatCard(
                title: 'Active Managers',
                value: activeManagers.toString(),
                icon: Icons.groups,
                borderColor: AreaManagerTheme.primaryGreen,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Second row
        Row(
          children: [
            Expanded(
              child: AreaManagerStatCard(
                title: 'Pending Approvals',
                value: pendingApprovals.toString(),
                icon: Icons.pending_actions,
                borderColor: AreaManagerTheme.pendingOrange,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AreaManagerStatCard(
                title: "Today's Harvest",
                value: todayHarvest,
                icon: Icons.agriculture,
                borderColor: AreaManagerTheme.primaryGreen,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
