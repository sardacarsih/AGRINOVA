import 'package:flutter/material.dart';
import '../area_manager_theme.dart';

/// Molecule: Performance Bar for Area Manager
/// Horizontal progress bar with estate name and percentage
class AreaManagerPerformanceBar extends StatelessWidget {
  final String estateName;
  final double percentage;
  final Color? barColor;

  const AreaManagerPerformanceBar({
    super.key,
    required this.estateName,
    required this.percentage,
    this.barColor,
  });

  @override
  Widget build(BuildContext context) {
    final color = barColor ?? AreaManagerTheme.getPerformanceColor(percentage);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$estateName: ${percentage.toInt()}%',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Stack(
            children: [
              // Background
              Container(
                height: 8,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              // Progress
              FractionallySizedBox(
                widthFactor: percentage / 100,
                child: Container(
                  height: 8,
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

