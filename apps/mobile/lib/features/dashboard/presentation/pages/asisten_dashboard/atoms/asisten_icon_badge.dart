import 'package:flutter/material.dart';
import '../asisten_theme.dart';

/// Atom: Icon Badge
/// Icon with notification badge
class AsistenIconBadge extends StatelessWidget {
  final IconData icon;
  final int badgeCount;
  final Color? iconColor;

  const AsistenIconBadge({
    Key? key,
    required this.icon,
    this.badgeCount = 0,
    this.iconColor,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icon, color: iconColor ?? Colors.white, size: 24),
        if (badgeCount > 0)
          Positioned(
            right: -6,
            top: -6,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AsistenTheme.rejectedRed,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 1.5),
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
