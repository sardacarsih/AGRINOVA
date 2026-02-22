// Gen Z Actions Grid - Molecule Component for Mandor Dashboard
// 3x2 grid of quick action buttons

import 'package:flutter/material.dart';
import '../mandor_theme.dart';
import '../atoms/genz_action_button.dart';

/// Model for action item configuration
class ActionItem {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final int? badgeCount;

  const ActionItem({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
    this.badgeCount,
  });
}

/// 3x2 grid of quick action buttons
class GenZActionsGrid extends StatelessWidget {
  final VoidCallback onHarvestInput;
  final VoidCallback onEmployeeSelect;
  final VoidCallback onQualityCheck;
  final VoidCallback onHistory;
  final VoidCallback onReports;
  final VoidCallback onSettings;

  const GenZActionsGrid({
    super.key,
    required this.onHarvestInput,
    required this.onEmployeeSelect,
    required this.onQualityCheck,
    required this.onHistory,
    required this.onReports,
    required this.onSettings,
  });

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
      'Aksi Cepat',
      style: MandorTheme.headingSmall,
    );
  }

  Widget _buildGrid() {
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 0.85,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      children: [
        GenZActionButton.green(
          label: 'Input Panen',
          icon: Icons.agriculture_rounded,
          onTap: onHarvestInput,
        ),
        GenZActionButton.blue(
          label: 'Pilih Karyawan',
          icon: Icons.people_rounded,
          onTap: onEmployeeSelect,
        ),
        GenZActionButton.orange(
          label: 'Cek Kualitas',
          icon: Icons.verified_rounded,
          onTap: onQualityCheck,
        ),
        GenZActionButton.purple(
          label: 'Riwayat',
          icon: Icons.history_rounded,
          onTap: onHistory,
        ),
        GenZActionButton.red(
          label: 'Laporan',
          icon: Icons.assessment_rounded,
          onTap: onReports,
        ),
        GenZActionButton.gray(
          label: 'Pengaturan',
          icon: Icons.settings_rounded,
          onTap: onSettings,
        ),
      ],
    );
  }
}

/// Custom actions grid with arbitrary action buttons
class GenZCustomActionsGrid extends StatelessWidget {
  final List<ActionItem> actions;
  final int crossAxisCount;
  final double childAspectRatio;
  final String? title;

  const GenZCustomActionsGrid({
    super.key,
    required this.actions,
    this.crossAxisCount = 3,
    this.childAspectRatio = 0.85,
    this.title,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null) ...[
          Text(title!, style: MandorTheme.headingSmall),
          const SizedBox(height: 14),
        ],
        GridView.count(
          crossAxisCount: crossAxisCount,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: childAspectRatio,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          children: actions.map((action) => GenZActionButton(
            label: action.label,
            icon: action.icon,
            color: action.color,
            onTap: action.onTap,
            badgeCount: action.badgeCount,
          )).toList(),
        ),
      ],
    );
  }
}

/// Horizontal scrollable actions row
class GenZActionsRow extends StatelessWidget {
  final List<ActionItem> actions;

  const GenZActionsRow({
    super.key,
    required this.actions,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 100,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: actions.length,
        separatorBuilder: (context, index) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final action = actions[index];
          return SizedBox(
            width: 80,
            child: GenZActionButton(
              label: action.label,
              icon: action.icon,
              color: action.color,
              onTap: action.onTap,
              badgeCount: action.badgeCount,
            ),
          );
        },
      ),
    );
  }
}
