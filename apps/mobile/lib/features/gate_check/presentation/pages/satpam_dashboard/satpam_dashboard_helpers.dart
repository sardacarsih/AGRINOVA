import 'package:flutter/material.dart';
import 'satpam_dashboard_constants.dart';

/// Helper utilities for Satpam Dashboard
class SatpamDashboardHelpers {
  /// Show snackbar message
  static void showSnackBar(
    BuildContext context,
    String message, {
    bool isError = false,
    Duration duration = const Duration(seconds: 3),
  }) {
    if (!context.mounted) return;
    
    final messenger = ScaffoldMessenger.of(context);
    
    // Clear any existing snackbars
    messenger.clearSnackBars();
    
    // Show new snackbar
    messenger.showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
        duration: duration,
        behavior: SnackBarBehavior.floating,
        action: SnackBarAction(
          label: 'OK',
          textColor: Colors.white,
          onPressed: () => messenger.hideCurrentSnackBar(),
        ),
      ),
    );
  }

  /// Show loading dialog
  static void showLoadingDialog(
    BuildContext context, {
    String message = 'Loading...',
  }) {
    if (!context.mounted) return;
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          content: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(width: 20),
              Expanded(child: Text(message)),
            ],
          ),
        );
      },
    );
  }

  /// Hide loading dialog
  static void hideLoadingDialog(BuildContext context) {
    if (context.mounted && Navigator.canPop(context)) {
      Navigator.of(context).pop();
    }
  }

  /// Show confirmation dialog
  static Future<bool> showConfirmationDialog(
    BuildContext context, {
    required String title,
    required String message,
    String confirmText = 'Yes',
    String cancelText = 'No',
  }) async {
    if (!context.mounted) return false;
    
    final result = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(cancelText),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: Text(confirmText),
            ),
          ],
        );
      },
    );
    
    return result ?? false;
  }

  /// Show error dialog
  static void showErrorDialog(
    BuildContext context, {
    required String title,
    required String message,
    String buttonText = 'OK',
  }) {
    if (!context.mounted) return;
    
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(buttonText),
            ),
          ],
        );
      },
    );
  }

  /// Format date for display
  static String formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/'
        '${date.year}';
  }

  /// Format time for display
  static String formatTime(DateTime time) {
    return '${time.hour.toString().padLeft(2, '0')}:'
        '${time.minute.toString().padLeft(2, '0')}';
  }

  /// Format datetime for display
  static String formatDateTime(DateTime dateTime) {
    return '${formatDate(dateTime)} ${formatTime(dateTime)}';
  }

  /// Format file size for display
  static String formatFileSize(int bytes) {
    if (bytes < 1024) {
      return '$bytes B';
    } else if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    } else if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    } else {
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    }
  }

  /// Validate vehicle plate number
  static bool isValidVehiclePlate(String plate) {
    if (plate.isEmpty) return false;
    
    // Basic Indonesian vehicle plate validation
    // Format: AB 1234 CD or AB 1234 CDE
    final regex = RegExp(r'^[A-Z]{1,2}\s*\d{1,4}\s*[A-Z]{1,3}$');
    return regex.hasMatch(plate.toUpperCase().replaceAll(' ', ' '));
  }

  /// Validate phone number
  static bool isValidPhoneNumber(String phone) {
    if (phone.isEmpty) return false;
    
    // Basic Indonesian phone number validation
    final regex = RegExp(r'^(\+62|62|0)8[1-9][0-9]{6,9}$');
    return regex.hasMatch(phone.replaceAll(RegExp(r'[\s-()]'), ''));
  }

  /// Clean phone number for storage
  static String cleanPhoneNumber(String phone) {
    String cleaned = phone.replaceAll(RegExp(r'[\s-()]'), '');
    
    // Convert to standard format starting with +62
    if (cleaned.startsWith('08')) {
      cleaned = '+628${cleaned.substring(2)}';
    } else if (cleaned.startsWith('8')) {
      cleaned = '+628$cleaned';
    } else if (cleaned.startsWith('62') && !cleaned.startsWith('+62')) {
      cleaned = '+$cleaned';
    }
    
    return cleaned;
  }

  /// Generate random ID
  static String generateId([String prefix = '']) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = (timestamp % 10000).toString().padLeft(4, '0');
    return '$prefix${prefix.isNotEmpty ? '_' : ''}$timestamp$random';
  }

  /// Build section header widget
  static Widget buildSectionHeader(String title, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: SatpamDashboardConstants.largePadding,
        vertical: SatpamDashboardConstants.mediumPadding,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(SatpamDashboardConstants.borderRadius),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            color: color,
            size: SatpamDashboardConstants.iconSize,
          ),
          const SizedBox(width: SatpamDashboardConstants.smallPadding),
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Build loading indicator widget
  static Widget buildLoadingIndicator(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(SatpamDashboardConstants.largePadding),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: SatpamDashboardConstants.mediumPadding),
            Text(
              message,
              style: const TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  /// Build error widget with retry functionality
  static Widget buildError(String errorMessage, VoidCallback onRetry) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(SatpamDashboardConstants.largePadding),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red[400],
            ),
            const SizedBox(height: SatpamDashboardConstants.mediumPadding),
            Text(
              'Terjadi Kesalahan',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.red[700],
              ),
            ),
            const SizedBox(height: SatpamDashboardConstants.smallPadding),
            Text(
              errorMessage,
              style: const TextStyle(
                fontSize: 14,
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: SatpamDashboardConstants.largePadding),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Coba Lagi'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.indigo,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: SatpamDashboardConstants.largePadding,
                  vertical: SatpamDashboardConstants.mediumPadding,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
