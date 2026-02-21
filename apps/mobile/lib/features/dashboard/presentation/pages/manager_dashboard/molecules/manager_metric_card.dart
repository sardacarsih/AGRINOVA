import 'package:flutter/material.dart';
import '../manager_theme.dart';

/// Molecule: Metric Card
/// Displays a performance metric with icon, value, and change indicator
/// Updated for light mode design
class ManagerMetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String? change;
  final IconData icon;
  final Color color;
  final bool isPositive;
  final VoidCallback? onTap;

  const ManagerMetricCard({
    Key? key,
    required this.title,
    required this.value,
    this.change,
    required this.icon,
    required this.color,
    this.isPositive = true,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(ManagerTheme.paddingMedium),
        decoration: ManagerTheme.whiteCardDecoration,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                if (change != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: (isPositive ? ManagerTheme.approvedGreen : ManagerTheme.rejectedRed).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isPositive ? Icons.arrow_upward : Icons.arrow_downward,
                          color: isPositive ? ManagerTheme.approvedGreen : ManagerTheme.rejectedRed,
                          size: 12,
                        ),
                        const SizedBox(width: 2),
                        Text(
                          change!,
                          style: TextStyle(
                            color: isPositive ? ManagerTheme.approvedGreen : ManagerTheme.rejectedRed,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const Spacer(),
            Text(
              value,
              style: TextStyle(
                color: ManagerTheme.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              title,
              style: TextStyle(
                color: ManagerTheme.textSecondary,
                fontSize: 12,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
