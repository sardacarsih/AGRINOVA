// Gen Z Dashboard Content - Organism Component for Mandor Dashboard
// Main dashboard tab content combining all molecules

import 'package:flutter/material.dart';
import '../mandor_theme.dart';
import '../molecules/genz_welcome_header.dart';
import '../molecules/genz_stats_grid.dart';
import '../molecules/genz_actions_grid.dart';
import 'genz_pending_section.dart';
import 'genz_activity_section.dart';

/// Main dashboard content organism
/// Combines welcome header, stats, actions, pending, and activity sections
class GenZDashboardContent extends StatelessWidget {
  final String userName;
  final String? division;
  final bool isOffline;
  final String? currentTime;

  // Stats data
  final String harvestValue;
  final String pendingValue;
  final String employeeValue;
  final String blockValue;

  // Navigation callbacks
  final VoidCallback onHarvestInput;
  final VoidCallback onEmployeeSelect;
  final VoidCallback onQualityCheck;
  final VoidCallback onHistory;
  final VoidCallback onReports;
  final VoidCallback onSettings;
  final VoidCallback onViewAllPending;
  final VoidCallback onViewAllActivity;

  // Data lists
  final List<PendingItem> pendingItems;
  final List<ActivityItem> activityItems;

  const GenZDashboardContent({
    super.key,
    required this.userName,
    this.division,
    this.isOffline = false,
    this.currentTime,
    this.harvestValue = '0 jjg',
    this.pendingValue = '0',
    this.employeeValue = '0',
    this.blockValue = '0',
    required this.onHarvestInput,
    required this.onEmployeeSelect,
    required this.onQualityCheck,
    required this.onHistory,
    required this.onReports,
    required this.onSettings,
    required this.onViewAllPending,
    required this.onViewAllActivity,
    this.pendingItems = const [],
    this.activityItems = const [],
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: MandorTheme.darkGradient,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome Header
            GenZWelcomeHeader(
              userName: userName,
              division: division,
              isOffline: isOffline,
              currentTime: currentTime,
            ),

            const SizedBox(height: 24),

            // Today's Summary Stats
            GenZStatsGrid(
              harvestValue: harvestValue,
              pendingValue: pendingValue,
              employeeValue: employeeValue,
              blockValue: blockValue,
            ),

            // Quick Actions removed as per user request

            // Pending Approvals Section
            GenZPendingSection(
              items: pendingItems,
              onViewAll: onViewAllPending,
            ),

            const SizedBox(height: 24),

            // Recent Activity Section
            GenZActivitySection(
              items: activityItems,
              onViewAll: onViewAllActivity,
            ),

            // Bottom padding for bottom nav
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }
}

/// Compact dashboard content for tablets/landscape
class GenZDashboardContentCompact extends StatelessWidget {
  final String userName;
  final String? division;
  final bool isOffline;

  // Stats data
  final String harvestValue;
  final String pendingValue;
  final String employeeValue;
  final String blockValue;

  // Navigation callbacks
  final VoidCallback onHarvestInput;
  final VoidCallback onEmployeeSelect;
  final VoidCallback onQualityCheck;
  final VoidCallback onHistory;
  final VoidCallback onReports;
  final VoidCallback onSettings;

  const GenZDashboardContentCompact({
    super.key,
    required this.userName,
    this.division,
    this.isOffline = false,
    this.harvestValue = '0 jjg',
    this.pendingValue = '0',
    this.employeeValue = '0',
    this.blockValue = '0',
    required this.onHarvestInput,
    required this.onEmployeeSelect,
    required this.onQualityCheck,
    required this.onHistory,
    required this.onReports,
    required this.onSettings,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: MandorTheme.darkGradient,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left column - Stats
          Expanded(
            flex: 1,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  GenZWelcomeHeaderCompact(
                    userName: userName,
                    subtitle: division ?? 'All Divisions',
                  ),
                  const SizedBox(height: 16),
                  GenZStatsGrid(
                    harvestValue: harvestValue,
                    pendingValue: pendingValue,
                    employeeValue: employeeValue,
                    blockValue: blockValue,
                  ),
                ],
              ),
            ),
          ),

          // Right column - Actions
          Expanded(
            flex: 1,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: GenZActionsGrid(
                onHarvestInput: onHarvestInput,
                onEmployeeSelect: onEmployeeSelect,
                onQualityCheck: onQualityCheck,
                onHistory: onHistory,
                onReports: onReports,
                onSettings: onSettings,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
