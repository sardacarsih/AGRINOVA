import 'package:flutter/material.dart';
import '../manager_theme.dart';

/// Atom: Stat Indicator
/// Displays a single stat value with label
class ManagerStatIndicator extends StatelessWidget {
  final String label;
  final String value;
  final IconData? icon;
  final Color? color;

  const ManagerStatIndicator({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final indicatorColor = color ?? ManagerTheme.primaryPurple;
    
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[
          Icon(icon, color: indicatorColor, size: 16),
          const SizedBox(width: 4),
        ],
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value,
              style: TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              label,
              style: ManagerTheme.bodySmall,
            ),
          ],
        ),
      ],
    );
  }
}
