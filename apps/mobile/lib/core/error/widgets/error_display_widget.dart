import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../error/error_handler.dart';
import '../../error/app_error.dart';

/// User-friendly error display widget
class ErrorDisplayWidget extends StatelessWidget {
  final AppError error;
  final VoidCallback? onRetry;
  final VoidCallback? onReportError;
  final VoidCallback? onGoHome;
  final Map<String, dynamic>? errorContext;
  final bool showTechnicalDetails;

  const ErrorDisplayWidget({
    Key? key,
    required this.error,
    this.onRetry,
    this.onReportError,
    this.onGoHome,
    this.errorContext,
    this.showTechnicalDetails = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final suggestion = ErrorHandler().getRecoverySuggestion(error);

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 40),

              // Error icon based on severity
              _buildErrorIcon(),

              const SizedBox(height: 24),

              // Error title
              Text(
                _getErrorTitle(),
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 12),

              // Error message
              Text(
                ErrorHandler().getUserMessage(error),
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.grey.shade600,
                  height: 1.4,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 16),

              // Recovery suggestion
              // Recovery suggestion
              if (suggestion != null) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.blue.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.lightbulb_outline,
                        color: Colors.blue.shade700,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          suggestion,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.blue.shade700,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // Action buttons
              _buildActionButtons(context),

              const SizedBox(height: 24),

              // Technical details (expandable)
              if (showTechnicalDetails) _buildTechnicalDetails(context),

              const SizedBox(height: 16),

              // Error reporting
              if (onReportError != null) _buildErrorReporting(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorIcon() {
    IconData icon;
    Color color;

    switch (error.code) {
      case 'NETWORK_NO_CONNECTION':
      case 'NETWORK_TIMEOUT':
        icon = Icons.wifi_off;
        color = Colors.orange;
        break;

      case 'AUTH_INVALID_CREDENTIALS':
      case 'AUTH_TOKEN_EXPIRED':
        icon = Icons.lock;
        color = Colors.red;
        break;

      case 'VALIDATION_REQUIRED':
      case 'VALIDATION_INVALID_FORMAT':
        icon = Icons.error_outline;
        color = Colors.amber;
        break;

      case 'DEVICE_PERMISSION_DENIED':
        icon = Icons.block;
        color = Colors.purple;
        break;

      case 'DEVICE_STORAGE_NOT_AVAILABLE':
        icon = Icons.storage;
        color = Colors.deepOrange;
        break;

      default:
        icon = Icons.error;
        color = Colors.red;
    }

    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        shape: BoxShape.circle,
        border: Border.all(
          color: color.withOpacity(0.3),
          width: 2,
        ),
      ),
      child: Icon(
        icon,
        size: 48,
        color: color,
      ),
    );
  }

  String _getErrorTitle() {
    switch (error.code) {
      case 'NETWORK_NO_CONNECTION':
        return 'Tidak Ada Koneksi Internet';
      case 'NETWORK_TIMEOUT':
        return 'Koneksi Timeout';
      case 'AUTH_INVALID_CREDENTIALS':
        return 'Login Gagal';
      case 'AUTH_TOKEN_EXPIRED':
        return 'Sesi Berakhir';
      case 'VALIDATION_REQUIRED':
        return 'Data Tidak Lengkap';
      case 'VALIDATION_INVALID_FORMAT':
        return 'Format Data Salah';
      case 'DEVICE_PERMISSION_DENIED':
        return 'Izin Diperlukan';
      case 'DEVICE_STORAGE_NOT_AVAILABLE':
        return 'Penyimpanan Penuh';
      case 'SYNC_CONFLICT_DETECTED':
        return 'Konflik Data';
      default:
        return 'Terjadi Kesalahan';
    }
  }

  Widget _buildActionButtons(BuildContext context) {
    final errorAction = ErrorHandler().getErrorAction(error);
    final buttons = <Widget>[];

    // Primary action based on error type
    switch (errorAction) {
      case ErrorAction.retry:
        if (onRetry != null) {
          buttons.add(
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Coba Lagi'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          );
        }
        break;

      case ErrorAction.logout:
        buttons.add(
          ElevatedButton.icon(
            onPressed: () {
              // Navigate to login
              Navigator.of(context).pushNamedAndRemoveUntil(
                '/login',
                (route) => false,
              );
            },
            icon: const Icon(Icons.logout),
            label: const Text('Login Kembali'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          ),
        );
        break;

      case ErrorAction.sync:
        buttons.add(
          ElevatedButton.icon(
            onPressed: () {
              // Trigger sync
              Navigator.of(context).pop();
            },
            icon: const Icon(Icons.sync),
            label: const Text('Sync'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          ),
        );
        break;

      case ErrorAction.openSettings:
        buttons.add(
          ElevatedButton.icon(
            onPressed: () {
              // Open app settings
              _openAppSettings();
            },
            icon: const Icon(Icons.settings),
            label: const Text('Buka Pengaturan'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.purple,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          ),
        );
        break;

      default:
        if (onRetry != null) {
          buttons.add(
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Coba Lagi'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          );
        }
    }

    // Secondary actions
    if (onGoHome != null) {
      buttons.add(
        OutlinedButton.icon(
          onPressed: onGoHome,
          icon: const Icon(Icons.home),
          label: const Text('Beranda'),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          ),
        ),
      );
    }

    // Return to previous screen
    buttons.add(
      TextButton.icon(
        onPressed: () => Navigator.of(context).pop(),
        icon: const Icon(Icons.arrow_back),
        label: const Text('Kembali'),
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
    );

    // Layout buttons
    if (buttons.length == 1) {
      return buttons.first;
    } else if (buttons.length == 2) {
      return Row(
        children: [
          Expanded(child: buttons.first),
          const SizedBox(width: 12),
          Expanded(child: buttons.last),
        ],
      );
    } else {
      return Column(
        children: buttons.map((button) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SizedBox(
              width: double.infinity,
              child: button,
            ),
          );
        }).toList(),
      );
    }
  }

  Widget _buildTechnicalDetails(BuildContext context) {
    return ExpansionTile(
      title: Text(
        'Detail Teknis',
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
          fontWeight: FontWeight.w500,
        ),
      ),
      leading: const Icon(Icons.bug_report),
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          margin: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildDetailRow('Kode Error', error.code),
              _buildDetailRow('Pesan', error.message),
              if (errorContext != null) ...[
                _buildDetailRow('Context', errorContext.toString()),
              ],
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: _getFullErrorDetails()));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Detail error disalin')),
                        );
                      },
                      icon: const Icon(Icons.copy),
                      label: const Text('Salin Detail'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        _shareErrorDetails();
                      },
                      icon: const Icon(Icons.share),
                      label: const Text('Bagikan'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontWeight: FontWeight.w500,
                fontSize: 12,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorReporting(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Icon(
                Icons.bug_report,
                color: Colors.grey.shade600,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Masih mengalami masalah?',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Laporkan masalah ini kepada tim teknis untuk bantuan lebih lanjut.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onReportError,
                  icon: const Icon(Icons.send),
                  label: const Text('Laporkan Masalah'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    _contactSupport();
                  },
                  icon: const Icon(Icons.support_agent),
                  label: const Text('Hubungi Support'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _getFullErrorDetails() {
    final buffer = StringBuffer();
    buffer.writeln('=== Error Details ===');
    buffer.writeln('Code: ${error.code}');
    buffer.writeln('Message: ${error.message}');
    buffer.writeln('Type: ${error.runtimeType}');
    if (errorContext != null) {
      buffer.writeln('Context: $errorContext');
    }
    buffer.writeln('Timestamp: ${DateTime.now().toIso8601String()}');
    return buffer.toString();
  }

  Future<void> _shareErrorDetails() async {
    try {
      final errorDetails = _getFullErrorDetails();
      final uri = Uri.parse('mailto:support@agrinova.com?subject=Error Report&body=${Uri.encodeComponent(errorDetails)}');

      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      }
    } catch (e) {
      // Handle error silently
    }
  }

  Future<void> _contactSupport() async {
    try {
      final uri = Uri.parse('tel:+62812345678');
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      }
    } catch (e) {
      // Handle error silently
    }
  }

  Future<void> _openAppSettings() async {
    try {
      // In a real app, you would use the app_settings package
      // For now, just show a message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Buka pengaturan aplikasi dari menu sistem'),
          duration: Duration(seconds: 3),
        ),
      );
    } catch (e) {
      // Handle error silently
    }
  }
}