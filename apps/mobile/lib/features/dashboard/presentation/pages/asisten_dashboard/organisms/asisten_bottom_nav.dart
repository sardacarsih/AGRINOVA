import 'package:flutter/material.dart';
import '../asisten_theme.dart';

/// Organism: Bottom Navigation
/// Bottom navigation for Asisten dashboard tabs
class AsistenBottomNav extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;

  const AsistenBottomNav({
    Key? key,
    required this.currentIndex,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AsistenTheme.cardBackground,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        backgroundColor: AsistenTheme.cardBackground,
        currentIndex: currentIndex,
        selectedItemColor: AsistenTheme.primaryBlue,
        unselectedItemColor: AsistenTheme.textMuted,
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
