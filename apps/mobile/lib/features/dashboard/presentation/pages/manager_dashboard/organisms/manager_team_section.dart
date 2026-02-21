import 'package:flutter/material.dart';
import '../manager_theme.dart';
import '../../../../data/models/manager_dashboard_models.dart';

/// Organism: Team Section
/// Displays top performers and team stats - "Performa Tim"
class ManagerTeamSection extends StatelessWidget {
  final VoidCallback? onViewAll;
  final List<TeamMemberPerformanceModel>? topPerformers;

  const ManagerTeamSection({
    Key? key,
    this.onViewAll,
    this.topPerformers,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final members = topPerformers ?? const <TeamMemberPerformanceModel>[];

    return Container(
      decoration: ManagerTheme.whiteCardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(ManagerTheme.paddingMedium),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Performa Tim', style: ManagerTheme.headingMedium),
                TextButton(
                  onPressed: onViewAll,
                  child: Text(
                    'Lihat Detail',
                    style: TextStyle(
                      color: ManagerTheme.primaryPurple,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(
                horizontal: ManagerTheme.paddingMedium),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: ManagerTheme.primaryPurple.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Top Performers Hari Ini',
                style: TextStyle(
                  color: ManagerTheme.primaryPurple,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          if (members.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(
                horizontal: ManagerTheme.paddingMedium,
                vertical: 16,
              ),
              child: Text(
                'Belum ada data performa hari ini',
                style: TextStyle(
                  color: ManagerTheme.textSecondary,
                  fontSize: 13,
                ),
              ),
            )
          else
            ...members.asMap().entries.expand((entry) {
              final member = entry.value;
              final widgets = <Widget>[
                _buildPerformerItem(
                  entry.key + 1,
                  member.name,
                  member.assignment,
                  '${member.recordsToday} catatan',
                  '${member.performanceScore.toStringAsFixed(1)}%',
                ),
              ];
              if (entry.key < members.length - 1) {
                widgets.add(
                  const Divider(height: 1, indent: 16, endIndent: 16),
                );
              }
              return widgets;
            }),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildPerformerItem(int rank, String name, String division,
      String production, String percentage) {
    // Medal colors
    final medalColors = [
      const Color(0xFFFFD700), // Gold
      const Color(0xFFC0C0C0), // Silver
      const Color(0xFFCD7F32), // Bronze
    ];

    final medalColor = rank <= 3 ? medalColors[rank - 1] : Colors.grey;
    final percentValue = double.tryParse(percentage.replaceAll('%', '')) ?? 0;

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: ManagerTheme.paddingMedium,
        vertical: 12,
      ),
      child: Row(
        children: [
          // Medal badge
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: medalColor.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                '$rank',
                style: TextStyle(
                  color: medalColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Name and division
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    color: ManagerTheme.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                Text(
                  division,
                  style: TextStyle(
                    color: ManagerTheme.textMuted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          // Production
          Expanded(
            flex: 2,
            child: Text(
              production,
              style: const TextStyle(
                color: ManagerTheme.textPrimary,
                fontWeight: FontWeight.w500,
                fontSize: 13,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          // Percentage with progress indicator
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  percentage,
                  style: const TextStyle(
                    color: ManagerTheme.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: percentValue / 100,
                    backgroundColor:
                        ManagerTheme.primaryPurple.withOpacity(0.1),
                    valueColor: AlwaysStoppedAnimation<Color>(
                      ManagerTheme.primaryPurple,
                    ),
                    minHeight: 4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
