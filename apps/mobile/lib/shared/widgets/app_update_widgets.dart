import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/models/app_update_models.dart';

/// App Update Notification Banner Widget
///
/// Shows a persistent banner when app update is available
class AppUpdateBanner extends StatelessWidget {
  final AppUpdateInfo updateInfo;
  final VoidCallback? onUpdateTap;
  final VoidCallback? onDismiss;

  const AppUpdateBanner({
    super.key,
    required this.updateInfo,
    this.onUpdateTap,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isCritical = updateInfo.isCritical;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12.0),
      decoration: BoxDecoration(
        color: isCritical ? Colors.red.shade50 : Colors.blue.shade50,
        border: Border.all(
          color: isCritical ? Colors.red.shade300 : Colors.blue.shade300,
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            isCritical ? Icons.warning : Icons.system_update,
            color: isCritical ? Colors.red : Colors.blue,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isCritical ? 'Critical Update Required' : 'Update Available',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: isCritical
                        ? Colors.red.shade800
                        : Colors.blue.shade800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Agrinova ${updateInfo.latestVersion} is ready to install',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: isCritical
                        ? Colors.red.shade600
                        : Colors.blue.shade600,
                  ),
                ),
                if (updateInfo.fileSizeBytes != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Size: ${updateInfo.formattedFileSize}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.grey.shade600,
                      fontSize: 11,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          if (!isCritical && onDismiss != null)
            IconButton(
              onPressed: onDismiss,
              icon: const Icon(Icons.close),
              iconSize: 20,
              color: Colors.grey.shade600,
            ),
          ElevatedButton(
            onPressed: onUpdateTap,
            style: ElevatedButton.styleFrom(
              backgroundColor: isCritical ? Colors.red : Colors.blue,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            ),
            child: Text(isCritical ? 'Update Now' : 'Update'),
          ),
        ],
      ),
    );
  }
}

/// App Update Dialog Widget
///
/// Shows detailed update information in a dialog
class AppUpdateDialog extends StatelessWidget {
  final AppUpdateInfo updateInfo;
  final VoidCallback? onUpdateTap;
  final VoidCallback? onLaterTap;
  final VoidCallback? onSkipTap;

  const AppUpdateDialog({
    super.key,
    required this.updateInfo,
    this.onUpdateTap,
    this.onLaterTap,
    this.onSkipTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isCritical = updateInfo.isCritical;

    return AlertDialog(
      title: Row(
        children: [
          Icon(
            isCritical ? Icons.warning : Icons.system_update,
            color: isCritical ? Colors.red : Colors.blue,
          ),
          const SizedBox(width: 8),
          Text(
            isCritical ? 'Critical Update' : 'App Update',
            style: TextStyle(color: isCritical ? Colors.red : Colors.blue),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Version ${updateInfo.latestVersion} is available',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            _buildUpdateInfo(context),
            if (updateInfo.releaseNotes != null) ...[
              const SizedBox(height: 16),
              _buildReleaseNotes(context),
            ],
          ],
        ),
      ),
      actions: _buildDialogActions(context, isCritical),
    );
  }

  Widget _buildUpdateInfo(BuildContext context) {
    return Card(
      color: Colors.grey.shade50,
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildInfoRow(
              context,
              'Version',
              updateInfo.latestVersion,
              Icons.info_outline,
            ),
            _buildInfoRow(
              context,
              'Type',
              _getUpdateTypeDisplay(),
              Icons.category_outlined,
            ),
            if (updateInfo.fileSizeBytes != null)
              _buildInfoRow(
                context,
                'Size',
                updateInfo.formattedFileSize,
                Icons.file_download_outlined,
              ),
            if (updateInfo.releaseDate != null)
              _buildInfoRow(
                context,
                'Released',
                DateFormat.yMMMd().format(updateInfo.releaseDate!),
                Icons.calendar_today_outlined,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(
    BuildContext context,
    String label,
    String value,
    IconData icon,
  ) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey.shade600),
          const SizedBox(width: 8),
          Text(
            '$label:',
            style: theme.textTheme.bodySmall?.copyWith(
              color: Colors.grey.shade600,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: theme.textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReleaseNotes(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'What\'s New',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12.0),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Text(
            updateInfo.releaseNotes!,
            style: theme.textTheme.bodySmall,
          ),
        ),
      ],
    );
  }

  List<Widget> _buildDialogActions(BuildContext context, bool isCritical) {
    final actions = <Widget>[];

    if (!isCritical && onSkipTap != null) {
      actions.add(
        TextButton(onPressed: onSkipTap, child: const Text('Skip Version')),
      );
    }

    if (onLaterTap != null) {
      actions.add(
        TextButton(
          onPressed: onLaterTap,
          child: Text(isCritical ? 'Close' : 'Later'),
        ),
      );
    }

    actions.add(
      ElevatedButton(
        onPressed: onUpdateTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: isCritical ? Colors.red : Colors.blue,
          foregroundColor: Colors.white,
        ),
        child: Text(isCritical ? 'Update Now' : 'Update'),
      ),
    );

    return actions;
  }

  String _getUpdateTypeDisplay() {
    switch (updateInfo.updateType) {
      case UpdateType.critical:
        return 'Critical';
      case UpdateType.recommended:
        return 'Recommended';
      case UpdateType.optional:
        return 'Optional';
    }
  }
}

/// App Update Progress Widget
///
/// Shows update download/installation progress
class AppUpdateProgressWidget extends StatelessWidget {
  final AppUpdateProgress progress;
  final VoidCallback? onCancel;

  const AppUpdateProgressWidget({
    super.key,
    required this.progress,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.all(16.0),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(_getStatusIcon(), color: _getStatusColor()),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Updating Agrinova',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (onCancel != null && progress.isInProgress)
                  IconButton(
                    onPressed: onCancel,
                    icon: const Icon(Icons.close),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (progress.message != null)
              Text(progress.message!, style: theme.textTheme.bodyMedium),
            const SizedBox(height: 12),
            if (progress.progress != null) ...[
              LinearProgressIndicator(
                value: progress.progress,
                backgroundColor: Colors.grey.shade300,
                valueColor: AlwaysStoppedAnimation<Color>(_getStatusColor()),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    progress.formattedProgress,
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (progress.updateInfo.fileSizeBytes != null)
                    Text(
                      progress.updateInfo.formattedFileSize,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.grey.shade600,
                      ),
                    ),
                ],
              ),
            ],
            if (progress.error != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  border: Border.all(color: Colors.red.shade300),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  progress.error!,
                  style: TextStyle(color: Colors.red.shade700, fontSize: 12),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  IconData _getStatusIcon() {
    switch (progress.status) {
      case UpdateProgressStatus.checking:
        return Icons.search;
      case UpdateProgressStatus.available:
        return Icons.system_update;
      case UpdateProgressStatus.downloading:
        return Icons.download;
      case UpdateProgressStatus.installing:
        return Icons.install_mobile;
      case UpdateProgressStatus.readyToInstall:
        return Icons.check_circle;
      case UpdateProgressStatus.completed:
        return Icons.check_circle;
      case UpdateProgressStatus.failed:
        return Icons.error;
      case UpdateProgressStatus.cancelled:
        return Icons.cancel;
    }
  }

  Color _getStatusColor() {
    switch (progress.status) {
      case UpdateProgressStatus.checking:
      case UpdateProgressStatus.available:
      case UpdateProgressStatus.downloading:
      case UpdateProgressStatus.installing:
        return Colors.blue;
      case UpdateProgressStatus.readyToInstall:
      case UpdateProgressStatus.completed:
        return Colors.green;
      case UpdateProgressStatus.failed:
        return Colors.red;
      case UpdateProgressStatus.cancelled:
        return Colors.orange;
    }
  }
}

/// App Update Settings Widget
///
/// Allows users to configure update preferences
class AppUpdateSettingsWidget extends StatefulWidget {
  final AppUpdatePolicy policy;
  final Function(AppUpdatePolicy) onPolicyChanged;

  const AppUpdateSettingsWidget({
    super.key,
    required this.policy,
    required this.onPolicyChanged,
  });

  @override
  State<AppUpdateSettingsWidget> createState() =>
      _AppUpdateSettingsWidgetState();
}

class _AppUpdateSettingsWidgetState extends State<AppUpdateSettingsWidget> {
  late AppUpdatePolicy _policy;

  @override
  void initState() {
    super.initState();
    _policy = widget.policy;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader('Automatic Updates'),
        _buildSwitchTile(
          'Check for updates automatically',
          'Periodically check for app updates in the background',
          _policy.autoCheckEnabled,
          (value) => _updatePolicy(_policy.copyWith(autoCheckEnabled: value)),
        ),
        _buildSwitchTile(
          'Download updates automatically',
          'Download updates when available (requires Wi-Fi)',
          _policy.autoDownloadEnabled,
          (value) =>
              _updatePolicy(_policy.copyWith(autoDownloadEnabled: value)),
        ),
        const Divider(),
        _buildSectionHeader('Network Settings'),
        _buildSwitchTile(
          'Wi-Fi only downloads',
          'Only download updates when connected to Wi-Fi',
          _policy.wifiOnlyDownload,
          (value) => _updatePolicy(_policy.copyWith(wifiOnlyDownload: value)),
        ),
        _buildSwitchTile(
          'Allow metered connections',
          'Download updates even on mobile data (may incur charges)',
          _policy.allowMeteredConnection,
          (value) =>
              _updatePolicy(_policy.copyWith(allowMeteredConnection: value)),
        ),
      ],
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.w600,
          color: Colors.blue.shade700,
        ),
      ),
    );
  }

  Widget _buildSwitchTile(
    String title,
    String subtitle,
    bool value,
    Function(bool) onChanged,
  ) {
    return SwitchListTile(
      title: Text(title),
      subtitle: Text(
        subtitle,
        style: Theme.of(
          context,
        ).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
      ),
      value: value,
      onChanged: onChanged,
      activeThumbColor: Colors.blue,
    );
  }

  void _updatePolicy(AppUpdatePolicy newPolicy) {
    setState(() {
      _policy = newPolicy;
    });
    widget.onPolicyChanged(newPolicy);
  }
}

/// Extension method to copy AppUpdatePolicy with changes
extension AppUpdatePolicyCopyWith on AppUpdatePolicy {
  AppUpdatePolicy copyWith({
    bool? autoCheckEnabled,
    bool? autoDownloadEnabled,
    bool? wifiOnlyDownload,
    bool? allowMeteredConnection,
    TimeRange? quietHours,
    List<String>? allowedNetworkTypes,
    int? maxDownloadSizeMB,
  }) {
    return AppUpdatePolicy(
      autoCheckEnabled: autoCheckEnabled ?? this.autoCheckEnabled,
      autoDownloadEnabled: autoDownloadEnabled ?? this.autoDownloadEnabled,
      wifiOnlyDownload: wifiOnlyDownload ?? this.wifiOnlyDownload,
      allowMeteredConnection:
          allowMeteredConnection ?? this.allowMeteredConnection,
      quietHours: quietHours ?? this.quietHours,
      allowedNetworkTypes: allowedNetworkTypes ?? this.allowedNetworkTypes,
      maxDownloadSizeMB: maxDownloadSizeMB ?? this.maxDownloadSizeMB,
    );
  }
}
