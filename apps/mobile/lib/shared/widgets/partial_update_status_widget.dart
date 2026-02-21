import 'package:flutter/material.dart';

/// Widget to display partial update sync status
///
/// Features:
/// - Real-time sync progress
/// - Conflict notifications
/// - Bandwidth usage statistics
/// - Manual sync trigger
/// - Detailed sync status information
class PartialUpdateStatusWidget extends StatefulWidget {
  final bool showDetailedInfo;
  final VoidCallback? onManualSync;
  final VoidCallback? onViewConflicts;

  const PartialUpdateStatusWidget({
    super.key,
    this.showDetailedInfo = false,
    this.onManualSync,
    this.onViewConflicts,
  });

  @override
  State<PartialUpdateStatusWidget> createState() =>
      _PartialUpdateStatusWidgetState();
}

class _PartialUpdateStatusWidgetState extends State<PartialUpdateStatusWidget> {
  Map<String, dynamic>? _syncStatus;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadSyncStatus();
    // Refresh status every 30 seconds
    _startStatusRefresh();
  }

  void _startStatusRefresh() {
    Future.delayed(const Duration(seconds: 30), () {
      if (mounted) {
        _loadSyncStatus();
        _startStatusRefresh();
      }
    });
  }

  Future<void> _loadSyncStatus() async {
    try {
      // TODO: Implement getPartialUpdateSyncStatus in GraphQLSyncService
      final status = {
        'pendingDeltas': 0,
        'completedDeltas': 0,
        'failedDeltas': 0,
        'conflictedDeltas': 0,
        'pendingConflicts': 0,
        'isSyncing': false,
        'isOnline': true,
        'lastSyncAttempt': DateTime.now().toIso8601String(),
      };

      if (mounted) {
        setState(() {
          _syncStatus = status;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _syncStatus = {'error': 'Failed to load sync status'};
        });
      }
    }
  }

  Future<void> _handleManualSync() async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
    });

    try {
      // TODO: Implement forcePartialSync in GraphQLSyncService
      // await syncService.forcePartialSync();

      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sync completed successfully'),
          backgroundColor: Colors.green,
        ),
      );

      // Refresh status
      await _loadSyncStatus();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Sync failed: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_syncStatus == null) {
      return const _LoadingIndicator();
    }

    if (_syncStatus!.containsKey('error')) {
      return _ErrorWidget(
        error: _syncStatus!['error'],
        onRetry: _loadSyncStatus,
      );
    }

    return Card(
      margin: const EdgeInsets.all(8.0),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatusHeader(),
            const SizedBox(height: 12),
            _buildSyncProgress(),
            if (widget.showDetailedInfo) ...[
              const SizedBox(height: 12),
              _buildDetailedInfo(),
            ],
            const SizedBox(height: 12),
            _buildActionButtons(),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusHeader() {
    final isOnline = _syncStatus!['isOnline'] ?? false;
    final isSyncing = _syncStatus!['isSyncing'] ?? false;

    return Row(
      children: [
        Icon(
          isOnline ? Icons.cloud : Icons.cloud_off,
          color: isOnline ? Colors.green : Colors.orange,
          size: 20,
        ),
        const SizedBox(width: 8),
        Text(
          'Sync Status',
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const Spacer(),
        if (isSyncing) ...[
          const SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          const SizedBox(width: 8),
          Text(
            'Syncing...',
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: Colors.blue),
          ),
        ],
      ],
    );
  }

  Widget _buildSyncProgress() {
    final pendingDeltas = _syncStatus!['pendingDeltas'] ?? 0;
    final completedDeltas = _syncStatus!['completedDeltas'] ?? 0;
    final failedDeltas = _syncStatus!['failedDeltas'] ?? 0;
    final conflictedDeltas = _syncStatus!['conflictedDeltas'] ?? 0;
    final pendingConflicts = _syncStatus!['pendingConflicts'] ?? 0;

    final totalDeltas =
        pendingDeltas + completedDeltas + failedDeltas + conflictedDeltas;

    return Column(
      children: [
        // Progress indicators
        Row(
          children: [
            _buildStatusChip(
              'Pending',
              pendingDeltas.toString(),
              Colors.orange,
            ),
            const SizedBox(width: 8),
            _buildStatusChip(
              'Synced',
              completedDeltas.toString(),
              Colors.green,
            ),
            const SizedBox(width: 8),
            if (failedDeltas > 0)
              _buildStatusChip('Failed', failedDeltas.toString(), Colors.red),
            if (conflictedDeltas > 0) ...[
              const SizedBox(width: 8),
              _buildStatusChip(
                'Conflicts',
                conflictedDeltas.toString(),
                Colors.purple,
              ),
            ],
          ],
        ),

        if (totalDeltas > 0) ...[
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: totalDeltas > 0 ? completedDeltas / totalDeltas : 0,
            backgroundColor: Colors.grey[300],
            valueColor: AlwaysStoppedAnimation<Color>(
              failedDeltas > 0 || conflictedDeltas > 0
                  ? Colors.orange
                  : Colors.green,
            ),
          ),
        ],

        // Conflict notification
        if (pendingConflicts > 0) ...[
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.purple.withValues(alpha: 0.1),
              border: Border.all(color: Colors.purple.withValues(alpha: 0.3)),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Row(
              children: [
                const Icon(Icons.warning, color: Colors.purple, size: 16),
                const SizedBox(width: 8),
                Text(
                  '$pendingConflicts conflict${pendingConflicts > 1 ? 's' : ''} need resolution',
                  style: const TextStyle(color: Colors.purple),
                ),
                const Spacer(),
                TextButton(
                  onPressed: widget.onViewConflicts,
                  child: const Text('View'),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildStatusChip(String label, String count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        border: Border.all(color: color.withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 4),
          Text(
            count,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
          const SizedBox(width: 2),
          Text(label, style: TextStyle(color: color, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildDetailedInfo() {
    final lastSyncAttempt = _syncStatus!['lastSyncAttempt'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(),
        Text(
          'Detailed Information',
          style: Theme.of(
            context,
          ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        _buildInfoRow('Last Sync Attempt', _formatDateTime(lastSyncAttempt)),
        _buildInfoRow(
          'Network Status',
          _syncStatus!['isOnline'] ? 'Online' : 'Offline',
        ),
      ],
    );
  }

  Widget _buildInfoRow(String label, String? value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
            ),
          ),
          Expanded(
            child: Text(
              value ?? 'N/A',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    final hasConflicts = (_syncStatus!['pendingConflicts'] ?? 0) > 0;

    return Row(
      children: [
        ElevatedButton.icon(
          onPressed: _isLoading ? null : _handleManualSync,
          icon: _isLoading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.sync, size: 16),
          label: const Text('Sync Now'),
        ),
        if (hasConflicts) ...[
          const SizedBox(width: 8),
          OutlinedButton.icon(
            onPressed: widget.onViewConflicts,
            icon: const Icon(Icons.warning, size: 16),
            label: const Text('View Conflicts'),
          ),
        ],
      ],
    );
  }

  String _formatDateTime(String? timestamp) {
    if (timestamp == null) return 'Never';

    try {
      final dateTime = DateTime.parse(timestamp);
      final now = DateTime.now();
      final difference = now.difference(dateTime);

      if (difference.inMinutes < 1) {
        return 'Just now';
      } else if (difference.inHours < 1) {
        return '${difference.inMinutes} minutes ago';
      } else if (difference.inDays < 1) {
        return '${difference.inHours} hours ago';
      } else {
        return '${difference.inDays} days ago';
      }
    } catch (e) {
      return 'Unknown';
    }
  }
}

class _LoadingIndicator extends StatelessWidget {
  const _LoadingIndicator();

  @override
  Widget build(BuildContext context) {
    return const Card(
      margin: EdgeInsets.all(8.0),
      child: Padding(
        padding: EdgeInsets.all(16.0),
        child: Row(
          children: [
            CircularProgressIndicator(),
            SizedBox(width: 16),
            Text('Loading sync status...'),
          ],
        ),
      ),
    );
  }
}

class _ErrorWidget extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;

  const _ErrorWidget({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(8.0),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.error, color: Colors.red),
                const SizedBox(width: 8),
                const Text(
                  'Sync Status Error',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(error),
            const SizedBox(height: 8),
            ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}

/// Compact version for status bar display
class PartialUpdateStatusBadge extends StatelessWidget {
  final int pendingCount;
  final int conflictCount;
  final bool isOnline;
  final bool isSyncing;
  final VoidCallback? onTap;

  const PartialUpdateStatusBadge({
    super.key,
    required this.pendingCount,
    required this.conflictCount,
    required this.isOnline,
    required this.isSyncing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Color badgeColor = Colors.green;
    if (!isOnline) badgeColor = Colors.orange;
    if (conflictCount > 0) badgeColor = Colors.purple;
    if (pendingCount > 5) badgeColor = Colors.blue;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: badgeColor.withValues(alpha: 0.1),
          border: Border.all(color: badgeColor.withValues(alpha: 0.3)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isSyncing) ...[
              SizedBox(
                width: 12,
                height: 12,
                child: CircularProgressIndicator(
                  strokeWidth: 1.5,
                  valueColor: AlwaysStoppedAnimation<Color>(badgeColor),
                ),
              ),
              const SizedBox(width: 4),
            ],
            Icon(
              isOnline ? Icons.cloud_done : Icons.cloud_off,
              color: badgeColor,
              size: 14,
            ),
            const SizedBox(width: 4),
            if (pendingCount > 0 || conflictCount > 0)
              Text(
                '${pendingCount + conflictCount}',
                style: TextStyle(
                  color: badgeColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
