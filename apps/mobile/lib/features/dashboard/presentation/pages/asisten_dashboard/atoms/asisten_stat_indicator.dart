import 'package:flutter/material.dart';

/// Atom: Stat Indicator
/// Small stat display with icon
class AsistenStatIndicator extends StatelessWidget {
  final String label;
  final String value;
  final IconData? icon;
  final Color? color;

  const AsistenStatIndicator({
    Key? key,
    required this.label,
    required this.value,
    this.icon,
    this.color,
  }) : super(key: key);

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
            color: (color ?? Colors.white).withOpacity(0.75),
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}
