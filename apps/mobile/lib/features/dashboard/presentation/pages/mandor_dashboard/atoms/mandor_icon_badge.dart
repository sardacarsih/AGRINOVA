import 'package:flutter/material.dart';
import '../mandor_theme.dart';

/// Icon badge for Mandor dashboard
/// Shows notification count badge on an icon
class MandorIconBadge extends StatelessWidget {
  final IconData icon;
  final int badgeCount;
  final Color? iconColor;
  final double size;

  const MandorIconBadge({
    Key? key,
    required this.icon,
    this.badgeCount = 0,
    this.iconColor,
    this.size = 24,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icon, color: iconColor ?? Colors.white, size: size),
        if (badgeCount > 0)
          Positioned(
            right: -6,
            top: -6,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: MandorTheme.coralRed,
                shape: BoxShape.circle,
                border: Border.all(color: MandorTheme.darkGreen, width: 1.5),
              ),
              constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
              child: Text(
                badgeCount > 99 ? '99+' : '$badgeCount',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
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
