// Gen Z Stats Grid - Molecule Component for Mandor Dashboard
// 2x2 grid of stat cards for today's summary

import 'package:flutter/material.dart';
import '../mandor_theme.dart';
import '../atoms/genz_stat_card.dart';

/// 2x2 grid of stat cards showing today's summary
class GenZStatsGrid extends StatelessWidget {
  final String harvestValue;
  final String pendingValue;
  final String employeeValue;
  final String blockValue;
  final VoidCallback? onHarvestTap;
  final VoidCallback? onPendingTap;
  final VoidCallback? onEmployeeTap;
  final VoidCallback? onBlockTap;

  const GenZStatsGrid({
    Key? key,
    this.harvestValue = '0 jjg',
    this.pendingValue = '0',
    this.employeeValue = '0',
    this.blockValue = '0',
    this.onHarvestTap,
    this.onPendingTap,
    this.onEmployeeTap,
    this.onBlockTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildTitle(),
        const SizedBox(height: 14),
        _buildGrid(),
      ],
    );
  }

  Widget _buildTitle() {
    return Text(
      'Ringkasan Hari Ini',
      style: MandorTheme.headingSmall,
    );
  }

  Widget _buildGrid() {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.4,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      children: [
        GenZStatCard.green(
          value: harvestValue,
          label: 'Input Panen',
          icon: Icons.agriculture_rounded,
          onTap: onHarvestTap,
        ),
        GenZStatCard.orange(
          value: pendingValue,
          label: 'Pending Approval',
          icon: Icons.pending_actions_rounded,
          onTap: onPendingTap,
        ),
        GenZStatCard.blue(
          value: employeeValue,
          label: 'Karyawan Aktif',
          icon: Icons.people_rounded,
          onTap: onEmployeeTap,
        ),
        GenZStatCard.purple(
          value: blockValue,
          label: 'Blok Dikerjakan',
          icon: Icons.location_on_rounded,
          onTap: onBlockTap,
        ),
      ],
    );
  }
}

/// Custom stats grid with arbitrary stat cards
class GenZCustomStatsGrid extends StatelessWidget {
  final List<StatCardData> stats;
  final int crossAxisCount;
  final double childAspectRatio;

  const GenZCustomStatsGrid({
    Key? key,
    required this.stats,
    this.crossAxisCount = 2,
    this.childAspectRatio = 1.4,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: crossAxisCount,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: childAspectRatio,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      children: stats
          .map((stat) => GenZStatCard(
                value: stat.value,
                label: stat.label,
                icon: stat.icon,
                color: stat.color,
                subtitle: stat.subtitle,
                onTap: stat.onTap,
              ))
          .toList(),
    );
  }
}

/// Horizontal stats bar (quick summary)
class GenZQuickStatsBar extends StatelessWidget {
  final String totalLabel;
  final String totalValue;
  final String firstLabel;
  final String firstValue;
  final String secondLabel;
  final String secondValue;

  const GenZQuickStatsBar({
    Key? key,
    this.totalLabel = 'Total',
    this.totalValue = '0',
    this.firstLabel = 'Selesai',
    this.firstValue = '0',
    this.secondLabel = 'Pending',
    this.secondValue = '0',
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: MandorTheme.glassCardDark(),
      child: Row(
        children: [
          _buildStatItem(totalLabel, totalValue, MandorTheme.forestGreen),
          _buildDivider(),
          _buildStatItem(firstLabel, firstValue, MandorTheme.electricBlue),
          _buildDivider(),
          _buildStatItem(secondLabel, secondValue, MandorTheme.amberOrange),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style:
                MandorTheme.bodySmall.copyWith(color: color.withOpacity(0.8)),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 40,
      color: MandorTheme.gray700,
    );
  }
}
