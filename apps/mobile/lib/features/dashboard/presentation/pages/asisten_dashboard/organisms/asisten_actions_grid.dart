import 'package:flutter/material.dart';
import '../asisten_theme.dart';
import '../molecules/asisten_action_button.dart';

/// Organism: Actions Grid
/// Quick action buttons for asisten functions
class AsistenActionsGrid extends StatelessWidget {
  final VoidCallback? onApprovals;
  final VoidCallback? onBatchApproval;
  final VoidCallback? onQualityCheck;
  final VoidCallback? onMonitoring;
  final VoidCallback? onReports;
  final VoidCallback? onHistory;

  const AsistenActionsGrid({
    Key? key,
    this.onApprovals,
    this.onBatchApproval,
    this.onQualityCheck,
    this.onMonitoring,
    this.onReports,
    this.onHistory,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Menu Cepat', style: AsistenTheme.headingMedium),
        const SizedBox(height: AsistenTheme.paddingMedium),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 3,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 0.95,
          children: [
            AsistenActionButton(
              title: 'Approval',
              icon: Icons.approval_outlined,
              color: AsistenTheme.approvalBlue,
              onTap: onApprovals ?? () {},
            ),
            AsistenActionButton(
              title: 'Batch',
              icon: Icons.playlist_add_check,
              color: AsistenTheme.batchApprovalCyan,
              onTap: onBatchApproval ?? () {},
            ),
            AsistenActionButton(
              title: 'Quality',
              icon: Icons.fact_check_outlined,
              color: AsistenTheme.qualityCheckTeal,
              onTap: onQualityCheck ?? () {},
            ),
            AsistenActionButton(
              title: 'Monitoring',
              icon: Icons.monitor_outlined,
              color: AsistenTheme.monitoringPurple,
              onTap: onMonitoring ?? () {},
            ),
            AsistenActionButton(
              title: 'Laporan',
              icon: Icons.description_outlined,
              color: AsistenTheme.reportsOrange,
              onTap: onReports ?? () {},
            ),
            AsistenActionButton(
              title: 'History',
              icon: Icons.history,
              color: AsistenTheme.historyGray,
              onTap: onHistory ?? () {},
            ),
          ],
        ),
      ],
    );
  }
}
