import 'package:flutter/material.dart';

/// Constants and helper utilities for Satpam Dashboard
class SatpamDashboardConstants {
  // Tab indices
  static const int dashboardTabIndex = 0;
  static const int registrationTabIndex = 1;
  static const int validationTabIndex = 2;
  static const int historyTabIndex = 3;
  static const int profileTabIndex = 4;
  
  // Auto-refresh intervals
  static const Duration autoRefreshInterval = Duration(seconds: 30);
  static const Duration serviceInitRetryDelay = Duration(seconds: 2);
  static const int maxServiceInitRetries = 3;
  
  // Colors
  static const Color primaryColor = Color(0xFF2E7D32);
  static const Color accentColor = Color(0xFF4CAF50);
  static const Color warningColor = Color(0xFFF57C00);
  static const Color errorColor = Color(0xFFD32F2F);
  static const Color successColor = Color(0xFF388E3C);
  
  // Status colors
  static const Color onlineStatusColor = Colors.green;
  static const Color offlineStatusColor = Colors.orange;
  static const Color syncingStatusColor = Colors.blue;
  static const Color errorStatusColor = Colors.red;
  
  // Sizes and dimensions
  static const double cardElevation = 4.0;
  static const double borderRadius = 8.0;
  static const double iconSize = 24.0;
  static const double largePadding = 16.0;
  static const double mediumPadding = 12.0;
  static const double smallPadding = 8.0;
  
  // Animation durations
  static const Duration tabSwitchDuration = Duration(milliseconds: 300);
  static const Duration loadingAnimationDuration = Duration(milliseconds: 500);
  
  // Default values
  static const String defaultShiftInfo = 'Loading...';
  static const String defaultValidationAction = 'entry';
  static const int defaultTabLength = 5;
}

/// Dashboard utilities class 
class SatpamDashboardUtilities {
  /// Format timestamp to readable string
  static String formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);
    
    if (difference.inMinutes < 1) {
      return 'Baru saja';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} menit lalu';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} jam lalu';
    } else {
      return '${difference.inDays} hari lalu';
    }
  }
  
  /// Get status color based on sync status
  static Color getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'online':
      case 'synced':
      case 'connected':
        return SatpamDashboardConstants.onlineStatusColor;
      case 'syncing':
      case 'pending':
        return SatpamDashboardConstants.syncingStatusColor;
      case 'offline':
      case 'disconnected':
        return SatpamDashboardConstants.offlineStatusColor;
      case 'error':
      case 'failed':
        return SatpamDashboardConstants.errorStatusColor;
      default:
        return Colors.grey;
    }
  }
  
  /// Get status icon based on sync status
  static IconData getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'online':
      case 'synced':
      case 'connected':
        return Icons.cloud_done;
      case 'syncing':
      case 'pending':
        return Icons.sync;
      case 'offline':
      case 'disconnected':
        return Icons.cloud_off;
      case 'error':
      case 'failed':
        return Icons.error;
      default:
        return Icons.help;
    }
  }
  
  /// Build loading indicator
  static Widget buildLoadingIndicator([String? message]) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(SatpamDashboardConstants.primaryColor),
          ),
          if (message != null) ...[
            const SizedBox(height: SatpamDashboardConstants.largePadding),
            Text(
              message,
              style: const TextStyle(
                fontSize: 14,
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }
  
  /// Build error widget
  static Widget buildError(String error, VoidCallback? onRetry) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(SatpamDashboardConstants.largePadding),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: SatpamDashboardConstants.errorColor,
            ),
            const SizedBox(height: SatpamDashboardConstants.largePadding),
            Text(
              'Terjadi Kesalahan',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: SatpamDashboardConstants.smallPadding),
            Text(
              error,
              style: const TextStyle(
                fontSize: 14,
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: SatpamDashboardConstants.largePadding),
              ElevatedButton(
                onPressed: onRetry,
                style: ElevatedButton.styleFrom(
                  backgroundColor: SatpamDashboardConstants.primaryColor,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Coba Lagi'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Tab navigation helper
class TabNavigationHelper {
  /// Get tab title
  static String getTabTitle(int index) {
    switch (index) {
      case SatpamDashboardConstants.dashboardTabIndex:
        return 'Dashboard';
      case SatpamDashboardConstants.registrationTabIndex:
        return 'Registrasi';
      case SatpamDashboardConstants.validationTabIndex:
        return 'Validasi';
      case SatpamDashboardConstants.historyTabIndex:
        return 'History';
      case SatpamDashboardConstants.profileTabIndex:
        return 'Profil';
      default:
        return 'Tab $index';
    }
  }
  
  /// Get tab icon
  static IconData getTabIcon(int index) {
    switch (index) {
      case SatpamDashboardConstants.dashboardTabIndex:
        return Icons.dashboard;
      case SatpamDashboardConstants.registrationTabIndex:
        return Icons.person_add;
      case SatpamDashboardConstants.validationTabIndex:
        return Icons.verified_user;
      case SatpamDashboardConstants.historyTabIndex:
        return Icons.history;
      case SatpamDashboardConstants.profileTabIndex:
        return Icons.person;
      default:
        return Icons.tab;
    }
  }
  
  /// Get floating action button icon for tab
  static IconData? getFloatingActionButtonIcon(int index) {
    switch (index) {
      case SatpamDashboardConstants.registrationTabIndex:
        return Icons.add;
      case SatpamDashboardConstants.validationTabIndex:
        return Icons.qr_code_scanner;
      default:
        return null;
    }
  }
}