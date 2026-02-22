import 'package:flutter/material.dart';

/// Atom: Stat Indicator
/// Small stat display with icon
class AsistenStatIndicator extends StatelessWidget {
  final String label;
  final String value;
  final IconData? icon;
  final Color? color;

  const AsistenStatIndicator({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[
          Icon(icon, color: color ?? Colors.white, size: 18),
          const SizedBox(height: 4),
        ],
        Text(
          value,
          style: TextStyle(
            color: color ?? Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            color: (color ?? Colors.white).withValues(alpha: 0.75),
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}

