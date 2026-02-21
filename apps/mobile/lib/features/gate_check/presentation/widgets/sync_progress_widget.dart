import 'package:flutter/material.dart';
import '../../data/models/sync_progress.dart';

/// Sync Progress Widget
/// 
/// Reusable widget for displaying real-time sync progress
class SyncProgressWidget extends StatelessWidget {
  final SyncProgress progress;
  final VoidCallback? onCancel;
  final VoidCallback? onPause;
  final VoidCallback? onResume;
  final bool showActions;

  const SyncProgressWidget({
    Key? key,
    required this.progress,
    this.onCancel,
    this.onPause,
    this.onResume,
    this.showActions = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with stage
            Row(
              children: [
                _buildStageIcon(),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _getStageText(),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        progress.tableName,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  '${progress.percentage}%',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: _getStageColor(),
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // Progress bar
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress.progress,
                minHeight: 8,
                backgroundColor: Colors.grey[200],
                valueColor: AlwaysStoppedAnimation<Color>(_getStageColor()),
              ),
            ),
            
            const SizedBox(height: 12),
            
            // Details
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Bytes uploaded
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Uploaded',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey[600],
                      ),
                    ),
                    Text(
                      '${progress.formattedBytesUploaded} / ${progress.formattedTotalBytes}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                
                // ETA
                if (!progress.isCompleted && !progress.isFailed)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'ETA',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey[600],
                        ),
                      ),
                      Text(
                        progress.formattedTimeRemaining,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            
            // Error message if failed
            if (progress.isFailed && progress.errorMessage != null)
              Container(
                margin: const EdgeInsets.only(top: 12),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Colors.red.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, size: 16, color: Colors.red),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        progress.errorMessage!,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.red,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            
            // Actions
            if (showActions && !progress.isCompleted)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (onPause != null && progress.stage == 'uploading')
                      TextButton.icon(
                        onPressed: onPause,
                        icon: const Icon(Icons.pause, size: 16),
                        label: const Text('Pause'),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.orange,
                        ),
                      ),
                    if (onResume != null && progress.stage == 'paused')
                      TextButton.icon(
                        onPressed: onResume,
                        icon: const Icon(Icons.play_arrow, size: 16),
                        label: const Text('Resume'),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.green,
                        ),
                      ),
                    if (onCancel != null)
                      TextButton.icon(
                        onPressed: onCancel,
                        icon: const Icon(Icons.close, size: 16),
                        label: const Text('Cancel'),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.red,
                        ),
                      ),
                  ],
                ),
              ),
            
            // Completed indicator
            if (progress.isCompleted && !progress.isFailed)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Row(
                  children: [
                    Icon(Icons.check_circle, size: 16, color: Colors.green[700]),
                    const SizedBox(width: 8),
                    Text(
                      'Sync completed successfully',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.green[700],
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  /// Get stage icon
  Widget _buildStageIcon() {
    IconData icon;
    Color color;
    
    switch (progress.stage) {
      case 'queued':
        icon = Icons.schedule;
        color = Colors.grey;
        break;
      case 'uploading':
        icon = Icons.cloud_upload;
        color = Colors.blue;
        break;
      case 'validating':
        icon = Icons.verified;
        color = Colors.orange;
        break;
      case 'completed':
        icon = Icons.check_circle;
        color = Colors.green;
        break;
      case 'paused':
        icon = Icons.pause_circle;
        color = Colors.orange;
        break;
      default:
        icon = Icons.sync;
        color = Colors.grey;
    }
    
    if (progress.isFailed) {
      icon = Icons.error;
      color = Colors.red;
    }
    
    return Icon(icon, color: color, size: 20);
  }

  /// Get stage text
  String _getStageText() {
    if (progress.isFailed) return 'Failed';
    
    switch (progress.stage) {
      case 'queued':
        return 'Queued';
      case 'uploading':
        return 'Uploading...';
      case 'validating':
        return 'Validating...';
      case 'completed':
        return 'Completed';
      case 'paused':
        return 'Paused';
      default:
        return 'Syncing...';
    }
  }

  /// Get stage color
  Color _getStageColor() {
    if (progress.isFailed) return Colors.red;
    
    switch (progress.stage) {
      case 'queued':
        return Colors.grey;
      case 'uploading':
        return Colors.blue;
      case 'validating':
        return Colors.orange;
      case 'completed':
        return Colors.green;
      case 'paused':
        return Colors.orange;
      default:
        return Colors.blue;
    }
  }
}

/// Compact Sync Progress Widget
/// 
/// Smaller version for list items
class CompactSyncProgressWidget extends StatelessWidget {
  final SyncProgress progress;

  const CompactSyncProgressWidget({
    Key? key,
    required this.progress,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress.progress,
                  minHeight: 6,
                  backgroundColor: Colors.grey[200],
                  valueColor: AlwaysStoppedAnimation<Color>(
                    progress.isFailed ? Colors.red : Colors.blue,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '${progress.percentage}%',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: progress.isFailed ? Colors.red : Colors.blue,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          '${progress.formattedBytesUploaded} / ${progress.formattedTotalBytes}',
          style: TextStyle(
            fontSize: 11,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }
}
