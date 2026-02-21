import 'package:flutter/material.dart';
import '../manager_theme.dart';
import '../../../../data/models/manager_dashboard_models.dart';

/// Organism: Reports Section
/// Displays recent reports with status - "Laporan Terkini"
class ManagerReportsSection extends StatelessWidget {
  final VoidCallback? onViewAll;
  final ManagerTodayHighlightsModel? highlights;

  const ManagerReportsSection({
    Key? key,
    this.onViewAll,
    this.highlights,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final approvedText =
        highlights != null ? '${highlights!.approvedToday}' : '--';
    final pendingText =
        highlights != null ? '${highlights!.pendingApprovals}' : '--';
    final rejectedText =
        highlights != null ? '${highlights!.rejectedToday}' : '--';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Aktivitas Panen Hari Ini', style: ManagerTheme.headingMedium),
        const SizedBox(height: ManagerTheme.paddingMedium),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(ManagerTheme.paddingMedium),
          decoration: ManagerTheme.whiteCardDecoration,
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildStatusChip(
                text: '$approvedText Disetujui',
                color: ManagerTheme.approvedGreen,
                icon: Icons.check,
              ),
              _buildStatusChip(
                text: '$pendingText Menunggu',
                color: ManagerTheme.pendingOrange,
                icon: Icons.hourglass_top,
              ),
              _buildStatusChip(
                text: '$rejectedText Ditolak',
                color: ManagerTheme.rejectedRed,
                icon: Icons.close,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatusChip({
    required String text,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            text,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
