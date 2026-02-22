// Gen Z Chip - Atomic Component
// Animated filter/toggle chip

import 'package:flutter/material.dart';

/// An animated chip for filters and toggles
class GenZChip extends StatelessWidget {
  final String label;
  final IconData? icon;
  final bool isSelected;
  final Color selectedColor;
  final VoidCallback onTap;
  final double? width;

  const GenZChip({
    super.key,
    required this.label,
    this.icon,
    required this.isSelected,
    required this.selectedColor,
    required this.onTap,
    this.width,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: width,
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
        decoration: BoxDecoration(
          color: isSelected ? selectedColor.withValues(alpha: 0.2) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? selectedColor.withValues(alpha: 0.5) : Colors.transparent,
          ),
        ),
        child: Row(
          mainAxisSize: width != null ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 16,
                color: isSelected ? selectedColor : const Color(0xFF6B7280),
              ),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isSelected ? selectedColor : const Color(0xFF6B7280),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Period pill chip (rounded ends)
class GenZPillChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const GenZPillChip({
    super.key,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  static const _purple = Color(0xFF8B5CF6);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? _purple.withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? _purple.withValues(alpha: 0.5) : const Color(0xFF374151),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
            color: isSelected ? _purple : const Color(0xFF9CA3AF),
          ),
        ),
      ),
    );
  }
}

