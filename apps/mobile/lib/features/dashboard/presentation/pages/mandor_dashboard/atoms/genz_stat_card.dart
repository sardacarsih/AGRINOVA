// Gen Z Stat Card - Atomic Component for Mandor Dashboard
// Reusable stat card with gradient, glow effects and icon

import 'package:flutter/material.dart';
import '../mandor_theme.dart';

/// A stat card displaying a value with icon and label
/// Uses neon glow effect for modern Gen Z styling
class GenZStatCard extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;
  final Color color;
  final String? subtitle;
  final VoidCallback? onTap;

  const GenZStatCard({
    Key? key,
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
    this.subtitle,
    this.onTap,
  }) : super(key: key);

  /// Green theme stat card - for harvest/panen data
  factory GenZStatCard.green({
    required String value,
    required String label,
    required IconData icon,
    String? subtitle,
    VoidCallback? onTap,
  }) {
    return GenZStatCard(
      value: value,
      label: label,
      icon: icon,
      color: MandorTheme.forestGreen,
      subtitle: subtitle,
      onTap: onTap,
    );
  }

  /// Orange theme stat card - for pending items
  factory GenZStatCard.orange({
    required String value,
    required String label,
    required IconData icon,
    String? subtitle,
    VoidCallback? onTap,
  }) {
    return GenZStatCard(
      value: value,
      label: label,
      icon: icon,
      color: MandorTheme.amberOrange,
      subtitle: subtitle,
      onTap: onTap,
    );
  }

  /// Blue theme stat card - for people/team data
  factory GenZStatCard.blue({
    required String value,
    required String label,
    required IconData icon,
    String? subtitle,
    VoidCallback? onTap,
  }) {
    return GenZStatCard(
      value: value,
      label: label,
      icon: icon,
      color: MandorTheme.electricBlue,
      subtitle: subtitle,
      onTap: onTap,
    );
  }

  /// Purple theme stat card - for location/block data
  factory GenZStatCard.purple({
    required String value,
    required String label,
    required IconData icon,
    String? subtitle,
    VoidCallback? onTap,
  }) {
    return GenZStatCard(
      value: value,
      label: label,
      icon: icon,
      color: MandorTheme.purpleAccent,
      subtitle: subtitle,
      onTap: onTap,
    );
  }

  @override
  Widget build(BuildContext context) {
    final card = Container(
      padding: const EdgeInsets.all(16),
      decoration: MandorTheme.neonStatCard(color: color),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildIconContainer(),
              _buildValue(),
            ],
          ),
          const SizedBox(height: 12),
          _buildLabel(),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            _buildSubtitle(),
          ],
        ],
      ),
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: card,
      );
    }
    return card;
  }

  Widget _buildIconContainer() {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: MandorTheme.iconContainer(color: color),
      child: Icon(icon, color: Colors.white, size: 20),
    );
  }

  Widget _buildValue() {
    return Text(
      value,
      style: MandorTheme.statValue(color: color),
    );
  }

  Widget _buildLabel() {
    return Text(
      label,
      style: MandorTheme.statLabel(color: color),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }

  Widget _buildSubtitle() {
    return Text(
      subtitle!,
      style: MandorTheme.bodySmall.copyWith(
        color: color.withOpacity(0.6),
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }
}

/// Data class for stat card configuration
class StatCardData {
  final String value;
  final String label;
  final IconData icon;
  final Color color;
  final String? subtitle;
  final VoidCallback? onTap;

  const StatCardData({
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
    this.subtitle,
    this.onTap,
  });
}
