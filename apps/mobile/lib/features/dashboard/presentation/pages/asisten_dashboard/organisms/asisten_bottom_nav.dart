import 'package:flutter/material.dart';
import '../../../../../../core/theme/runtime_theme_slot_resolver.dart';
import '../asisten_theme.dart';

/// Organism: Bottom Navigation
/// Bottom navigation for Asisten dashboard tabs
class AsistenBottomNav extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;

  const AsistenBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final footerBg = RuntimeThemeSlotResolver.footerBackground(
      context,
      fallback: AsistenTheme.cardBackground,
    );
    final footerSelected = RuntimeThemeSlotResolver.footerSelected(
      context,
      fallback: AsistenTheme.primaryBlue,
    );
    final footerUnselected = RuntimeThemeSlotResolver.footerUnselected(
      context,
      fallback: AsistenTheme.textMuted,
    );
    final footerBorder = RuntimeThemeSlotResolver.footerBorder(
      context,
      fallback: Colors.transparent,
    );

    return Container(
      decoration: BoxDecoration(
        color: footerBg,
        border: RuntimeThemeSlotResolver.hasFooterBorder
            ? Border(top: BorderSide(color: footerBorder))
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        backgroundColor: footerBg,
        currentIndex: currentIndex,
        selectedItemColor: footerSelected,
        unselectedItemColor: footerUnselected,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
        unselectedLabelStyle: const TextStyle(fontSize: 12),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.approval_outlined),
            activeIcon: Icon(Icons.approval),
            label: 'Approval',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.monitor_outlined),
            activeIcon: Icon(Icons.monitor),
            label: 'Monitoring',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
        onTap: onTap,
      ),
    );
  }
}

