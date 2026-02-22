// Gen Z Stat Item - Atomic Component
// Single stat display with color

import 'package:flutter/material.dart';

/// A single stat display item
class GenZStatItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const GenZStatItem({
    super.key,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: Color(0xFF9CA3AF),
          ),
        ),
      ],
    );
  }
}

/// Vertical divider for stats
class GenZStatDivider extends StatelessWidget {
  const GenZStatDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 30,
      width: 1,
      color: const Color(0xFF374151),
    );
  }
}
