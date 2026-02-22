// Gen Z Section Header - Molecule Component
// Composed from atoms: IconBadge + Title + Subtitle

import 'package:flutter/material.dart';
import '../atoms/genz_icon_badge.dart';

/// Section header with icon badge, title, and optional subtitle
class GenZSectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Color iconColor;
  final Color? iconSecondaryColor;
  final Widget? trailing;

  const GenZSectionHeader({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    required this.iconColor,
    this.iconSecondaryColor,
    this.trailing,
  });

  /// Purple themed header
  factory GenZSectionHeader.purple({
    required IconData icon,
    required String title,
    String? subtitle,
    Widget? trailing,
  }) {
    return GenZSectionHeader(
      icon: icon,
      title: title,
      subtitle: subtitle,
      iconColor: const Color(0xFF8B5CF6),
      iconSecondaryColor: const Color(0xFF7C3AED),
      trailing: trailing,
    );
  }

  /// Blue themed header
  factory GenZSectionHeader.blue({
    required IconData icon,
    required String title,
    String? subtitle,
    Widget? trailing,
  }) {
    return GenZSectionHeader(
      icon: icon,
      title: title,
      subtitle: subtitle,
      iconColor: const Color(0xFF3B82F6),
      iconSecondaryColor: const Color(0xFF2563EB),
      trailing: trailing,
    );
  }

  /// Green themed header (for History)
  factory GenZSectionHeader.green({
    required IconData icon,
    required String title,
    String? subtitle,
    Widget? trailing,
  }) {
    return GenZSectionHeader(
      icon: icon,
      title: title,
      subtitle: subtitle,
      iconColor: const Color(0xFF34D399),
      iconSecondaryColor: const Color(0xFF10B981),
      trailing: trailing,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        GenZIconBadge(
          icon: icon,
          primaryColor: iconColor,
          secondaryColor: iconSecondaryColor,
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              if (subtitle != null)
                Text(
                  subtitle!,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF9CA3AF),
                  ),
                ),
            ],
          ),
        ),
        ?trailing,
      ],
    );
  }
}
