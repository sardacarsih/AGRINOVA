import 'package:flutter/material.dart';

import 'app_error.dart';
import 'error_handler.dart';

/// Global error widget for handling UI errors
class AppErrorWidget extends StatelessWidget {
  final AppError error;
  final VoidCallback? onRetry;
  final VoidCallback? onDismiss;
  final bool showDetails;

  const AppErrorWidget({
    super.key,
    required this.error,
    this.onRetry,
    this.onDismiss,
    this.showDetails = false,
  });

  @override
  Widget build(BuildContext context) {
    final errorHandler = ErrorHandler();
    final isRecoverable = errorHandler.isRecoverable(error);
    final suggestion = errorHandler.getRecoverySuggestion(error);
    final action = errorHandler.getErrorAction(error);

    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildErrorIcon(context),
          const SizedBox(height: 16),
          _buildErrorTitle(context),
          const SizedBox(height: 8),
          _buildErrorMessage(context),
          if (suggestion != null) ...[
            const SizedBox(height: 12),
            _buildSuggestion(context, suggestion),
          ],
          if (showDetails) ...[
            const SizedBox(height: 16),
            _buildErrorDetails(context),
          ],
          const SizedBox(height: 24),
          _buildActionButtons(context, action, isRecoverable),
        ],
      ),
    );
  }

  Widget _buildErrorIcon(BuildContext context) {
    IconData icon;
    Color color;

    switch (error.runtimeType) {
      case NetworkError _:
        icon = Icons.wifi_off;
        color = Colors.orange;
        break;
      case AuthError _:
        icon = Icons.lock_outline;
        color = Colors.red;
        break;
      case ValidationError _:
        icon = Icons.warning_outlined;
        color = Colors.amber;
        break;
      case DeviceError _:
        icon = Icons.phone_android;
        color = Colors.blue;
        break;
      case SyncError _:
        icon = Icons.sync_problem;
        color = Colors.purple;
        break;
      default:
        icon = Icons.error_outline;
        color = Colors.red;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        shape: BoxShape.circle,
      ),
      child: Icon(
        icon,
        size: 48,
        color: color,
      ),
    );
  }

  Widget _buildErrorTitle(BuildContext context) {
    String title;

    switch (error.runtimeType) {
      case NetworkError _:
        title = 'Masalah Koneksi';
        break;
      case AuthError _:
        title = 'Masalah Autentikasi';
        break;
      case ValidationError _:
        title = 'Data Tidak Valid';
        break;
      case DeviceError _:
        title = 'Masalah Perangkat';
        break;
      case SyncError _:
        title = 'Masalah Sync';
        break;
      case DatabaseError _:
        title = 'Masalah Database';
        break;
      case BusinessError _:
        title = 'Operasi Tidak Dapat Dilakukan';
        break;
      default:
        title = 'Terjadi Kesalahan';
    }

    return Text(
      title,
      style: Theme.of(context).textTheme.titleLarge?.copyWith(
        fontWeight: FontWeight.bold,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildErrorMessage(BuildContext context) {
    return Text(
      error.message,
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
        color: Colors.grey[600],
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildSuggestion(BuildContext context, String suggestion) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Row(
        children: [
          Icon(
            Icons.lightbulb_outline,
            color: Colors.blue[700],
            size: 20,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              suggestion,
              style: TextStyle(
                color: Colors.blue[700],
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorDetails(BuildContext context) {
    return ExpansionTile(
      title: const Text('Detail Teknis'),
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey[100],
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Kode Error: ${error.code}',
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                ),
              ),
              if (error.details != null) ...[
                const SizedBox(height: 8),
                Text(
                  'Details: ${error.details}',
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 12,
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons(BuildContext context, ErrorAction action, bool isRecoverable) {
    final buttons = <Widget>[];

    // Always show dismiss button
    buttons.add(
      OutlinedButton(
        onPressed: onDismiss,
        child: const Text('Tutup'),
      ),
    );

    // Add specific action button based on error type
    switch (action) {
      case ErrorAction.retry:
        if (onRetry != null) {
          buttons.insert(0, 
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Coba Lagi'),
            ),
          );
        }
        break;

      case ErrorAction.logout:
        buttons.insert(0,
          ElevatedButton.icon(
            onPressed: () => _handleLogout(context),
            icon: const Icon(Icons.logout),
            label: const Text('Login Ulang'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
          ),
        );
        break;

      case ErrorAction.openSettings:
        buttons.insert(0,
          ElevatedButton.icon(
            onPressed: () => _handleOpenSettings(context),
            icon: const Icon(Icons.settings),
            label: const Text('Buka Pengaturan'),
          ),
        );
        break;

      case ErrorAction.sync:
        buttons.insert(0,
          ElevatedButton.icon(
            onPressed: () => _handleSync(context),
            icon: const Icon(Icons.sync),
            label: const Text('Sync'),
          ),
        );
        break;

      default:
        if (isRecoverable && onRetry != null) {
          buttons.insert(0,
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Coba Lagi'),
            ),
          );
        }
        break;
    }

    return Wrap(
      spacing: 16,
      children: buttons,
    );
  }

  void _handleLogout(BuildContext context) {
    // Navigate to login screen
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
  }

  void _handleOpenSettings(BuildContext context) {
    // Open app settings
    // This would typically open device settings using a package like app_settings
  }

  void _handleSync(BuildContext context) {
    // Trigger sync operation
    // This would typically call a sync service
  }
}

/// Small error banner widget for inline errors
class ErrorBanner extends StatelessWidget {
  final AppError error;
  final VoidCallback? onRetry;
  final VoidCallback? onDismiss;

  const ErrorBanner({
    super.key,
    required this.error,
    this.onRetry,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _getErrorColor().withValues(alpha: 0.1),
        border: Border.all(color: _getErrorColor().withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            _getErrorIcon(),
            color: _getErrorColor(),
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              error.message,
              style: TextStyle(
                color: _getErrorColor(),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          if (onRetry != null) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: onRetry,
              child: Icon(
                Icons.refresh,
                color: _getErrorColor(),
                size: 20,
              ),
            ),
          ],
          if (onDismiss != null) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: onDismiss,
              child: Icon(
                Icons.close,
                color: _getErrorColor(),
                size: 20,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _getErrorColor() {
    switch (error.runtimeType) {
      case NetworkError _:
        return Colors.orange;
      case ValidationError _:
        return Colors.amber;
      case AuthError _:
        return Colors.red;
      default:
        return Colors.red;
    }
  }

  IconData _getErrorIcon() {
    switch (error.runtimeType) {
      case NetworkError _:
        return Icons.wifi_off;
      case ValidationError _:
        return Icons.warning;
      case AuthError _:
        return Icons.lock;
      default:
        return Icons.error;
    }
  }
}

/// Snackbar helper for showing errors
class ErrorSnackBar {
  static void show(
    BuildContext context,
    AppError error, {
    VoidCallback? onRetry,
    Duration duration = const Duration(seconds: 4),
  }) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(error.message),
        backgroundColor: _getErrorColor(error),
        duration: duration,
        action: onRetry != null
            ? SnackBarAction(
                label: 'Coba Lagi',
                textColor: Colors.white,
                onPressed: onRetry,
              )
            : null,
      ),
    );
  }

  static Color _getErrorColor(AppError error) {
    switch (error.runtimeType) {
      case NetworkError _:
        return Colors.orange;
      case ValidationError _:
        return Colors.amber[700]!;
      case AuthError _:
        return Colors.red;
      default:
        return Colors.red;
    }
  }
}

/// Error dialog helper
class ErrorDialog {
  static Future<void> show(
    BuildContext context,
    AppError error, {
    VoidCallback? onRetry,
    bool showDetails = false,
  }) async {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          content: AppErrorWidget(
            error: error,
            onRetry: onRetry,
            onDismiss: () => Navigator.of(context).pop(),
            showDetails: showDetails,
          ),
        );
      },
    );
  }
}
