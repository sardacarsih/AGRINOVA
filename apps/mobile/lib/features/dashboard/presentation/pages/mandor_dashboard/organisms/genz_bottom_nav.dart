// Gen Z Bottom Navigation - Organism Component for Mandor Dashboard
// Modern bottom navigation bar with animated items

import 'package:flutter/material.dart';
import '../mandor_theme.dart';

/// Bottom navigation item data
class BottomNavItem {
  final IconData icon;
  final IconData? activeIcon;
  final String label;

  const BottomNavItem({
    required this.icon,
    this.activeIcon,
    required this.label,
  });
}

/// Gen Z styled bottom navigation bar
class GenZBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final List<BottomNavItem> items;

  const GenZBottomNav({
    Key? key,
    required this.currentIndex,
    required this.onTap,
    required this.items,
  }) : super(key: key);

  /// Default navigation items for Mandor
  factory GenZBottomNav.mandor({
    required int currentIndex,
    required ValueChanged<int> onTap,
  }) {
    return GenZBottomNav(
      currentIndex: currentIndex,
      onTap: onTap,
      items: const [
        BottomNavItem(
          icon: Icons.dashboard_outlined,
          activeIcon: Icons.dashboard_rounded,
          label: 'Dashboard',
        ),
        BottomNavItem(
          icon: Icons.agriculture_outlined,
          activeIcon: Icons.agriculture_rounded,
          label: 'Input Panen',
        ),
        BottomNavItem(
          icon: Icons.history_outlined,
          activeIcon: Icons.history_rounded,
          label: 'Riwayat',
        ),
        BottomNavItem(
          icon: Icons.sync_outlined,
          activeIcon: Icons.sync_rounded,
          label: 'Sync',
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: MandorTheme.bottomNavDecoration,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: items.asMap().entries.map((entry) {
              final index = entry.key;
              final item = entry.value;
              final isSelected = index == currentIndex;
              
              return _NavItem(
                icon: isSelected ? (item.activeIcon ?? item.icon) : item.icon,
                label: item.label,
                isSelected: isSelected,
                onTap: () => onTap(index),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}

/// Single navigation item
class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _NavItem({
    Key? key,
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected 
              ? MandorTheme.forestGreen.withOpacity(0.15) 
              : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedScale(
              duration: const Duration(milliseconds: 200),
              scale: isSelected ? 1.1 : 1.0,
              child: Icon(
                icon,
                size: 24,
                color: isSelected 
                    ? MandorTheme.forestGreen 
                    : MandorTheme.gray500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                color: isSelected 
                    ? MandorTheme.forestGreen 
                    : MandorTheme.gray500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Floating action button for primary action
class GenZFloatingActionButton extends StatelessWidget {
  final VoidCallback onPressed;
  final IconData icon;
  final String label;

  const GenZFloatingActionButton({
    Key? key,
    required this.onPressed,
    this.icon = Icons.add_rounded,
    this.label = 'Input Panen',
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: MandorTheme.primaryGradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: MandorTheme.forestGreen.withOpacity(0.4),
            blurRadius: 16,
            spreadRadius: -4,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, color: Colors.white, size: 22),
                const SizedBox(width: 10),
                Text(
                  label,
                  style: MandorTheme.labelBold.copyWith(
                    fontSize: 15,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
