// Gen Z Quick Stats - Molecule Component
// Horizontal stats bar with dividers

import 'package:flutter/material.dart';
import '../atoms/genz_stat_item.dart';

/// Colors for stats
class GenZStatsColors {
  static const purple = Color(0xFF8B5CF6);
  static const mint = Color(0xFF34D399);
  static const blue = Color(0xFF3B82F6);
}

/// Quick stats bar with Total, Entry, Exit counts
class GenZQuickStats extends StatelessWidget {
  final int totalCount;
  final int entryCount;
  final int exitCount;

  const GenZQuickStats({
    Key? key,
    required this.totalCount,
    required this.entryCount,
    required this.exitCount,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF1F2937),
            const Color(0xFF1F2937).withOpacity(0.8),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF374151).withOpacity(0.5)),
      ),
      child: Row(
        children: [
          Expanded(
            child: GenZStatItem(
              label: 'Total',
              value: totalCount.toString(),
              color: GenZStatsColors.purple,
            ),
          ),
          const GenZStatDivider(),
          Expanded(
            child: GenZStatItem(
              label: 'Masuk',
              value: entryCount.toString(),
              color: GenZStatsColors.mint,
            ),
          ),
          const GenZStatDivider(),
          Expanded(
            child: GenZStatItem(
              label: 'Keluar',
              value: exitCount.toString(),
              color: GenZStatsColors.blue,
            ),
          ),
        ],
      ),
    );
  }
}

/// Custom stats bar with arbitrary items
class GenZStatsBar extends StatelessWidget {
  final List<GenZStatData> items;

  const GenZStatsBar({
    Key? key,
    required this.items,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF1F2937),
            const Color(0xFF1F2937).withOpacity(0.8),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF374151).withOpacity(0.5)),
      ),
      child: Row(
        children: items.asMap().entries.map((entry) {
          final isLast = entry.key == items.length - 1;
          return Expanded(
            child: Row(
              children: [
                Expanded(
                  child: GenZStatItem(
                    label: entry.value.label,
                    value: entry.value.value,
                    color: entry.value.color,
                  ),
                ),
                if (!isLast) const GenZStatDivider(),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

/// Data class for stat items
class GenZStatData {
  final String label;
  final String value;
  final Color color;

  const GenZStatData({
    required this.label,
    required this.value,
    required this.color,
  });
}
