// Gen Z Action Button - Atomic Component for Mandor Dashboard
// Quick action button with gradient icon and tap feedback

import 'package:flutter/material.dart';
import '../mandor_theme.dart';

/// A quick action button with icon and label
/// Uses gradient icon container for modern Gen Z styling
class GenZActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final int? badgeCount;

  const GenZActionButton({
    Key? key,
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
    this.badgeCount,
  }) : super(key: key);

  /// Green theme action button
  factory GenZActionButton.green({
    required String label,
    required IconData icon,
    required VoidCallback onTap,
    int? badgeCount,
  }) {
    return GenZActionButton(
      label: label,
      icon: icon,
      color: MandorTheme.forestGreen,
      onTap: onTap,
      badgeCount: badgeCount,
    );
  }

  /// Blue theme action button
  factory GenZActionButton.blue({
    required String label,
    required IconData icon,
    required VoidCallback onTap,
    int? badgeCount,
  }) {
    return GenZActionButton(
      label: label,
      icon: icon,
      color: MandorTheme.electricBlue,
      onTap: onTap,
      badgeCount: badgeCount,
    );
  }

  /// Orange theme action button
  factory GenZActionButton.orange({
    required String label,
    required IconData icon,
    required VoidCallback onTap,
    int? badgeCount,
  }) {
    return GenZActionButton(
      label: label,
      icon: icon,
      color: MandorTheme.amberOrange,
      onTap: onTap,
      badgeCount: badgeCount,
    );
  }

  /// Purple theme action button
  factory GenZActionButton.purple({
    required String label,
    required IconData icon,
    required VoidCallback onTap,
    int? badgeCount,
  }) {
    return GenZActionButton(
      label: label,
      icon: icon,
      color: MandorTheme.purpleAccent,
      onTap: onTap,
      badgeCount: badgeCount,
    );
  }

  /// Red theme action button
  factory GenZActionButton.red({
    required String label,
    required IconData icon,
    required VoidCallback onTap,
    int? badgeCount,
  }) {
    return GenZActionButton(
      label: label,
      icon: icon,
      color: MandorTheme.coralRed,
      onTap: onTap,
      badgeCount: badgeCount,
    );
  }

  /// Gray theme action button
  factory GenZActionButton.gray({
    required String label,
    required IconData icon,
    required VoidCallback onTap,
    int? badgeCount,
  }) {
    return GenZActionButton(
      label: label,
      icon: icon,
      color: MandorTheme.gray500,
      onTap: onTap,
      badgeCount: badgeCount,
    );
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.25)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildIconWithBadge(),
            const SizedBox(height: 10),
            _buildLabel(),
          ],
        ),
      ),
    );
  }

  Widget _buildIconWithBadge() {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: MandorTheme.iconContainer(color: color),
          child: Icon(icon, color: Colors.white, size: 26),
        ),
        if (badgeCount != null && badgeCount! > 0)
          Positioned(
            right: -6,
            top: -6,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: MandorTheme.coralRed,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: MandorTheme.gray900, width: 2),
              ),
              child: Text(
                badgeCount! > 99 ? '99+' : badgeCount.toString(),
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildLabel() {
    return Text(
      label,
      style: MandorTheme.bodySmall.copyWith(
        color: color,
        fontWeight: FontWeight.w600,
      ),
      textAlign: TextAlign.center,
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
    );
  }
}

/// Data class for action button configuration
class ActionButtonData {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final int? badgeCount;

  const ActionButtonData({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
    this.badgeCount,
  });
}
