import 'package:flutter/material.dart';
import '../area_manager_theme.dart';

/// Molecule: Statistics Card for Area Manager
/// Displays a metric with icon in a bordered card
class AreaManagerStatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color borderColor;
  final Color? iconBackgroundColor;

  const AreaManagerStatCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    required this.borderColor,
    this.iconBackgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: AreaManagerTheme.statCardDecoration(borderColor),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: (iconBackgroundColor ?? borderColor).withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              color: iconBackgroundColor ?? borderColor,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    color: borderColor,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  title,
                  style: AreaManagerTheme.bodySmall,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
