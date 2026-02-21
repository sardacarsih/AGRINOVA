// Gen Z Icon Badge - Atomic Component
// Gradient icon container with glow effect

import 'package:flutter/material.dart';

/// A gradient icon badge with optional glow effect
/// Used for section headers, list items, and navigation
class GenZIconBadge extends StatelessWidget {
  final IconData icon;
  final Color primaryColor;
  final Color? secondaryColor;
  final double size;
  final double iconSize;
  final bool showGlow;

  const GenZIconBadge({
    Key? key,
    required this.icon,
    required this.primaryColor,
    this.secondaryColor,
    this.size = 42,
    this.iconSize = 22,
    this.showGlow = true,
  }) : super(key: key);

  /// Purple theme badge
  factory GenZIconBadge.purple({
    required IconData icon,
    double size = 42,
    double iconSize = 22,
    bool showGlow = true,
  }) {
    return GenZIconBadge(
      icon: icon,
      primaryColor: const Color(0xFF8B5CF6),
      secondaryColor: const Color(0xFF7C3AED),
      size: size,
      iconSize: iconSize,
      showGlow: showGlow,
    );
  }

  /// Blue theme badge
  factory GenZIconBadge.blue({
    required IconData icon,
    double size = 42,
    double iconSize = 22,
    bool showGlow = true,
  }) {
    return GenZIconBadge(
      icon: icon,
      primaryColor: const Color(0xFF3B82F6),
      secondaryColor: const Color(0xFF2563EB),
      size: size,
      iconSize: iconSize,
      showGlow: showGlow,
    );
  }

  /// Green (mint) theme badge
  factory GenZIconBadge.mint({
    required IconData icon,
    double size = 42,
    double iconSize = 22,
    bool showGlow = true,
  }) {
    return GenZIconBadge(
      icon: icon,
      primaryColor: const Color(0xFF34D399),
      secondaryColor: const Color(0xFF10B981),
      size: size,
      iconSize: iconSize,
      showGlow: showGlow,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      padding: EdgeInsets.all(size * 0.24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [primaryColor, secondaryColor ?? primaryColor],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(size * 0.28),
        boxShadow: showGlow
            ? [
                BoxShadow(
                  color: primaryColor.withOpacity(0.3),
                  blurRadius: 8,
                  spreadRadius: -2,
                ),
              ]
            : null,
      ),
      child: Icon(icon, color: Colors.white, size: iconSize),
    );
  }
}

/// Smaller icon badge for list items
class GenZIconBadgeSmall extends StatelessWidget {
  final IconData icon;
  final Color color;
  final bool showGlow;

  const GenZIconBadgeSmall({
    Key? key,
    required this.icon,
    required this.color,
    this.showGlow = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(14),
        boxShadow: showGlow
            ? [
                BoxShadow(
                  color: color.withOpacity(0.2),
                  blurRadius: 8,
                  spreadRadius: -2,
                ),
              ]
            : null,
      ),
      child: Icon(icon, color: color, size: 24),
    );
  }
}
