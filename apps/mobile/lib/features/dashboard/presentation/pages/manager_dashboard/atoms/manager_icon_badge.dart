import 'package:flutter/material.dart';
import '../manager_theme.dart';

/// Atom: Icon Badge
/// Simple icon with optional badge/notification indicator
class ManagerIconBadge extends StatelessWidget {
  final IconData icon;
  final int? badgeCount;
  final Color? iconColor;
  final double size;

  const ManagerIconBadge({
    super.key,
    required this.icon,
    this.badgeCount,
    this.iconColor,
    this.size = ManagerTheme.iconMedium,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Icon(
          icon,
          color: iconColor ?? Colors.white,
          size: size,
        ),
        if (badgeCount != null && badgeCount! > 0)
          Positioned(
            right: 0,
            top: 0,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: ManagerTheme.rejectedRed,
                borderRadius: BorderRadius.circular(8),
              ),
              constraints: const BoxConstraints(
                minWidth: 14,
                minHeight: 14,
              ),
              child: Text(
                badgeCount! > 99 ? '99+' : '$badgeCount',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 8,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }
}
