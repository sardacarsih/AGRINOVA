// Gen Z List Item - Molecule Component
// Premium list item card for history/activity

import 'package:flutter/material.dart';
import '../atoms/genz_icon_badge.dart';
import '../genz_theme.dart';

/// Premium history/activity list item
class GenZListItem extends StatelessWidget {
  final String title;
  final String subtitle;
  final String? detail;
  final IconData icon;
  final Color iconColor;
  final String? badge;
  final String? trailing;
  final VoidCallback? onTap;

  const GenZListItem({
    super.key,
    required this.title,
    required this.subtitle,
    this.detail,
    required this.icon,
    required this.iconColor,
    this.badge,
    this.trailing,
    this.onTap,
  });

  /// Entry (MASUK) list item
  factory GenZListItem.entry({
    required String plate,
    required String driver,
    required String time,
    String? destination,
    VoidCallback? onTap,
  }) {
    return GenZListItem(
      title: plate,
      subtitle: driver,
      detail: '$time${destination != null ? ' • $destination' : ''}',
      icon: Icons.login_rounded,
      iconColor: const Color(0xFF34D399),
      badge: 'MASUK',
      onTap: onTap,
    );
  }

  /// Exit (KELUAR) list item
  factory GenZListItem.exit({
    required String plate,
    required String driver,
    required String time,
    String? destination,
    String? duration,
    VoidCallback? onTap,
  }) {
    return GenZListItem(
      title: plate,
      subtitle: driver,
      detail: '$time${destination != null ? ' • $destination' : ''}',
      icon: Icons.logout_rounded,
      iconColor: const Color(0xFF3B82F6),
      badge: 'KELUAR',
      trailing: duration,
      onTap: onTap,
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeColors = GenZTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: themeColors.cardBackground,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: themeColors.borderColor.withValues(alpha: 0.5),
          ),
          boxShadow: [
            BoxShadow(
              color: themeColors.shadowColor,
              blurRadius: 8,
              spreadRadius: -4,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            // Icon with glow
            GenZIconBadgeSmall(icon: icon, color: iconColor),
            const SizedBox(width: 14),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: themeColors.headingColor,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 4),

                  // Subtitle
                  Row(
                    children: [
                      Icon(
                        Icons.person_rounded,
                        size: 14,
                        color: themeColors.bodyTertiary,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          subtitle,
                          style: TextStyle(
                            fontSize: 13,
                            color: themeColors.bodySecondary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),

                  // Detail
                  if (detail != null) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          Icons.access_time_rounded,
                          size: 14,
                          color: themeColors.bodyTertiary,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            detail!,
                            style: TextStyle(
                              fontSize: 12,
                              color: themeColors.bodyTertiary,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            // Badge and trailing
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (badge != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: iconColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      badge!,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: iconColor,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                if (trailing != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    trailing!,
                    style: TextStyle(
                      fontSize: 11,
                      color: themeColors.bodyTertiary,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
