import 'dart:async';
import 'package:flutter/material.dart';
import 'package:logger/logger.dart';
import 'package:get_it/get_it.dart';

import '../../core/services/graphql_sync_service.dart';
import '../../core/services/enhanced_batch_sync_service.dart';
import '../../core/services/gate_check_photo_sync_service.dart';

/// Comprehensive Sync Status Widget for Satpam Gate Check Operations
/// 
/// Features:
/// - Real-time sync progress tracking
/// - Network connectivity status
/// - Pending operations count
/// - Error state display with retry options
/// - Photo sync progress with thumbnails
/// - Manual sync trigger
/// - Offline-first status indication
class SyncStatusWidget extends StatefulWidget {
  final bool showDetailed;
  final bool allowManualSync;
  final Function(String)? onSyncError;
  final Function()? onSyncComplete;
  
  const SyncStatusWidget({
    super.key,
    this.showDetailed = false,
    this.allowManualSync = true,
    this.onSyncError,
    this.onSyncComplete,
  });

  @override
  State<SyncStatusWidget> createState() => _SyncStatusWidgetState();
}

class _SyncStatusWidgetState extends State<SyncStatusWidget>
    with TickerProviderStateMixin {
  static final Logger _logger = Logger();
  final GetIt sl = GetIt.instance;
  
  late GraphQLSyncService _graphqlSyncService;
  late EnhancedBatchSyncService _batchSyncService;
  late GateCheckPhotoSyncService _photoSyncService;
  
  // Animation controllers
  late AnimationController _pulseController;
  late AnimationController _progressController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _progressAnimation;
  
  // Stream subscriptions
  StreamSubscription<BatchSyncEvent>? _batchSyncSubscription;
  StreamSubscription<PhotoUploadProgress>? _photoSyncSubscription;
  Timer? _statusRefreshTimer;
  
  // State variables
  SyncStatusState _currentState = SyncStatusState.idle;
  double _overallProgress = 0.0;
  int _pendingOperations = 0;
  int _pendingPhotos = 0;
  String _currentPhase = '';
  String _lastErrorMessage = '';
  bool _isNetworkAvailable = false;
  DateTime? _lastSyncTime;
  // ignore: unused_field
  BatchSyncEvent? _currentSyncReport;
  final List<PhotoUploadProgress> _activePhotoUploads = [];
  
  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _initializeServices();
    _startStatusRefresh();
  }
  
  @override
  void dispose() {
    _pulseController.dispose();
    _progressController.dispose();
    _batchSyncSubscription?.cancel();
    _photoSyncSubscription?.cancel();
    _statusRefreshTimer?.cancel();
    super.dispose();
  }
  
  void _initializeAnimations() {
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );
    
    _progressController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    
    _pulseAnimation = Tween<double>(
      begin: 0.8,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));
    
    _progressAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _progressController,
      curve: Curves.easeOut,
    ));
    
    _pulseController.repeat(reverse: true);
  }
  
  void _initializeServices() {
    try {
      _graphqlSyncService = sl<GraphQLSyncService>();
      
      _batchSyncService = EnhancedBatchSyncService();
      _photoSyncService = GateCheckPhotoSyncService();
      
      // Listen to batch sync progress
      _batchSyncSubscription = _batchSyncService.eventStream.listen(
        _onBatchSyncProgress,
        onError: (error) => _logger.e('Batch sync stream error', error: error),
      );
      
      // Listen to photo upload progress
      _photoSyncSubscription = _photoSyncService.uploadProgressStream.listen(
        _onPhotoUploadProgress,
        onError: (error) => _logger.e('Photo sync stream error', error: error),
      );
      
    } catch (e) {
      _logger.e('Error initializing sync services', error: e);
      setState(() {
        _currentState = SyncStatusState.error;
        _lastErrorMessage = 'Failed to initialize sync services: ${e.toString()}';
      });
    }
  }
  
  void _startStatusRefresh() {
    _statusRefreshTimer = Timer.periodic(
      const Duration(seconds: 5),
      (_) => _refreshSyncStatus(),
    );
    
    // Initial status refresh
    _refreshSyncStatus();
  }
  
  Future<void> _refreshSyncStatus() async {
    try {
      // Get sync service statuses
      final graphqlStatus = _graphqlSyncService.getSyncStatus();
      final batchStatus = _batchSyncService.getSyncStatus();
      
      // Get pending counts
      final pendingOps = await _batchSyncService.getPendingSyncCount();
      final pendingPhotos = await _photoSyncService.getPendingPhotoUploads();
      
      if (mounted) {
        setState(() {
          _isNetworkAvailable = graphqlStatus.isOnline;
          _pendingOperations = pendingOps;
          _pendingPhotos = pendingPhotos.length;
          _lastSyncTime = graphqlStatus.lastSuccessfulSync;
          
          // Update overall state
          if (graphqlStatus.isSyncing || batchStatus.isSyncing) {
            _currentState = SyncStatusState.syncing;
            if (!_progressController.isAnimating) {
              _progressController.forward();
            }
          } else if (_pendingOperations > 0 || _pendingPhotos > 0) {
            _currentState = SyncStatusState.pending;
            _progressController.reset();
          } else if (_lastErrorMessage.isNotEmpty) {
            _currentState = SyncStatusState.error;
            _progressController.reset();
          } else {
            _currentState = SyncStatusState.idle;
            _progressController.reset();
          }
        });
      }
      
    } catch (e) {
      _logger.e('Error refreshing sync status', error: e);
      if (mounted) {
        setState(() {
          _currentState = SyncStatusState.error;
          _lastErrorMessage = 'Status refresh failed: ${e.toString()}';
        });
      }
    }
  }
  
  void _onBatchSyncProgress(BatchSyncEvent event) {
    if (mounted) {
      setState(() {
        _currentSyncReport = event;
        _overallProgress = event.progress ?? 0.0;
        _currentPhase = event.message;
        
        switch (event.type) {
          case BatchSyncEventType.batchQueued:
          case BatchSyncEventType.batchStarted:
          case BatchSyncEventType.batchProgress:
            _currentState = SyncStatusState.syncing;
            break;
          case BatchSyncEventType.batchCompleted:
            _currentState = SyncStatusState.idle;
            widget.onSyncComplete?.call();
            break;
          case BatchSyncEventType.batchCancelled:
            _currentState = SyncStatusState.warning;
            break;
          case BatchSyncEventType.batchFailed:
            _currentState = SyncStatusState.error;
            _lastErrorMessage = event.error ?? 'Unknown sync error';
            widget.onSyncError?.call(_lastErrorMessage);
            break;
        }
      });
    }
  }
  
  void _onPhotoUploadProgress(PhotoUploadProgress progress) {
    if (mounted) {
      setState(() {
        // Update or add photo upload progress
        final existingIndex = _activePhotoUploads
            .indexWhere((p) => p.photoId == progress.photoId);
        
        if (existingIndex >= 0) {
          _activePhotoUploads[existingIndex] = progress;
        } else {
          _activePhotoUploads.add(progress);
        }
        
        // Remove completed uploads after a delay
        if (progress.progress >= 1.0) {
          Timer(const Duration(seconds: 3), () {
            if (mounted) {
              setState(() {
                _activePhotoUploads.removeWhere((p) => p.photoId == progress.photoId);
              });
            }
          });
        }
      });
    }
  }
  
  Future<void> _triggerManualSync() async {
    if (!widget.allowManualSync || _currentState == SyncStatusState.syncing) {
      return;
    }
    
    try {
      setState(() {
        _currentState = SyncStatusState.syncing;
        _currentPhase = 'Starting manual sync...';
        _lastErrorMessage = '';
      });
      
      // Trigger batch sync
      final result = await _batchSyncService.forceSyncNow();
      
      if (!result.success) {
        throw Exception(result.message);
      }
      
      // Refresh status after sync
      await _refreshSyncStatus();
      
    } catch (e) {
      _logger.e('Manual sync failed', error: e);
      setState(() {
        _currentState = SyncStatusState.error;
        _lastErrorMessage = 'Manual sync failed: ${e.toString()}';
      });
      widget.onSyncError?.call(_lastErrorMessage);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    if (widget.showDetailed) {
      return _buildDetailedView();
    } else {
      return _buildCompactView();
    }
  }
  
  Widget _buildCompactView() {
    final pendingOps = _pendingOperations;
    final pendingPhotos = _pendingPhotos;
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: _getStatusColor().withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: _getStatusColor().withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildStatusIcon(),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _getStatusText(),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: _getStatusColor(),
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (pendingOps > 0 || pendingPhotos > 0)
                Text(
                  '$pendingOps ops, $pendingPhotos photos',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                    fontSize: 10,
                  ),
                ),
            ],
          ),
          if (widget.allowManualSync) ...[
            const SizedBox(width: 8),
            InkWell(
              onTap: _triggerManualSync,
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Icon(
                  Icons.refresh,
                  size: 16,
                  color: _currentState == SyncStatusState.syncing
                      ? Colors.grey
                      : Theme.of(context).primaryColor,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
  
  Widget _buildDetailedView() {
    return Card(
      margin: const EdgeInsets.all(8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with status and manual sync button
            Row(
              children: [
                _buildStatusIcon(),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sync Status',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        _getStatusText(),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: _getStatusColor(),
                        ),
                      ),
                    ],
                  ),
                ),
                if (widget.allowManualSync)
                  ElevatedButton.icon(
                    onPressed: _currentState == SyncStatusState.syncing
                        ? null
                        : _triggerManualSync,
                    icon: Icon(
                      _currentState == SyncStatusState.syncing
                          ? Icons.hourglass_empty
                          : Icons.sync,
                      size: 18,
                    ),
                    label: Text(
                      _currentState == SyncStatusState.syncing
                          ? 'Syncing...'
                          : 'Sync Now',
                    ),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                    ),
                  ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // Progress indicators
            if (_currentState == SyncStatusState.syncing) ...[
              _buildSyncProgress(),
              const SizedBox(height: 12),
            ],
            
            // Statistics row
            Row(
              children: [
                Expanded(child: _buildStatCard('Pending Ops', _pendingOperations.toString())),
                const SizedBox(width: 8),
                Expanded(child: _buildStatCard('Pending Photos', _pendingPhotos.toString())),
                const SizedBox(width: 8),
                Expanded(child: _buildStatCard(
                  'Network',
                  _isNetworkAvailable ? 'Online' : 'Offline',
                )),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // Active photo uploads
            if (_activePhotoUploads.isNotEmpty) ...[
              Text(
                'Photo Uploads',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              ..._activePhotoUploads.take(3).map((progress) =>
                  _buildPhotoUploadTile(progress)),
              if (_activePhotoUploads.length > 3)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    '+${_activePhotoUploads.length - 3} more photos uploading...',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                ),
              const SizedBox(height: 12),
            ],
            
            // Error display
            if (_lastErrorMessage.isNotEmpty) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Colors.red[200]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.error_outline, color: Colors.red[700], size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Sync Error',
                          style: TextStyle(
                            color: Colors.red[700],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _lastErrorMessage,
                      style: TextStyle(
                        color: Colors.red[600],
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            
            // Last sync time
            if (_lastSyncTime != null)
              Text(
                'Last sync: ${_formatSyncTime(_lastSyncTime!)}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildStatusIcon() {
    Widget icon;
    
    switch (_currentState) {
      case SyncStatusState.syncing:
        icon = AnimatedBuilder(
          animation: _pulseAnimation,
          builder: (context, child) => Transform.scale(
            scale: _pulseAnimation.value,
            child: Icon(
              Icons.sync,
              color: Colors.blue,
              size: 20,
            ),
          ),
        );
        break;
      case SyncStatusState.pending:
        icon = Icon(Icons.schedule, color: Colors.orange, size: 20);
        break;
      case SyncStatusState.error:
        icon = Icon(Icons.error, color: Colors.red, size: 20);
        break;
      case SyncStatusState.warning:
        icon = Icon(Icons.warning, color: Colors.amber, size: 20);
        break;
      case SyncStatusState.idle:
        icon = Icon(
          Icons.cloud_done,
          color: _isNetworkAvailable ? Colors.green : Colors.grey,
          size: 20,
        );
        break;
    }
    
    return icon;
  }
  
  Widget _buildSyncProgress() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                _currentPhase,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
            Text(
              '${(_overallProgress * 100).toInt()}%',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        AnimatedBuilder(
          animation: _progressAnimation,
          builder: (context, child) => LinearProgressIndicator(
            value: _overallProgress * _progressAnimation.value,
            backgroundColor: Colors.grey[200],
            valueColor: AlwaysStoppedAnimation<Color>(
              Theme.of(context).primaryColor,
            ),
          ),
        ),
      ],
    );
  }
  
  Widget _buildStatCard(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Colors.grey[600],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
  
  Widget _buildPhotoUploadTile(PhotoUploadProgress progress) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Row(
        children: [
          Icon(Icons.photo, color: Colors.blue[700], size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  progress.stage,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                LinearProgressIndicator(
                  value: progress.progress,
                  backgroundColor: Colors.blue[100],
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.blue),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '${(progress.progress * 100).toInt()}%',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Colors.blue[700],
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
  
  Color _getStatusColor() {
    switch (_currentState) {
      case SyncStatusState.syncing:
        return Colors.blue;
      case SyncStatusState.pending:
        return Colors.orange;
      case SyncStatusState.error:
        return Colors.red;
      case SyncStatusState.warning:
        return Colors.amber;
      case SyncStatusState.idle:
        return _isNetworkAvailable ? Colors.green : Colors.grey;
    }
  }
  
  String _getStatusText() {
    switch (_currentState) {
      case SyncStatusState.syncing:
        return 'Syncing...';
      case SyncStatusState.pending:
        return 'Pending sync';
      case SyncStatusState.error:
        return 'Sync error';
      case SyncStatusState.warning:
        return 'Partial sync';
      case SyncStatusState.idle:
        if (_isNetworkAvailable) {
          return 'Up to date';
        } else {
          return 'Offline';
        }
    }
  }
  
  String _formatSyncTime(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);
    
    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else {
      return '${difference.inDays}d ago';
    }
  }
}

/// Lightweight sync status indicator for use in app bars
class SyncStatusIndicator extends StatefulWidget {
  final Function()? onTap;
  
  const SyncStatusIndicator({super.key, this.onTap});

  @override
  State<SyncStatusIndicator> createState() => _SyncStatusIndicatorState();
}

class _SyncStatusIndicatorState extends State<SyncStatusIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  Timer? _statusTimer;
  final SyncStatusState _status = SyncStatusState.idle;
  final int _pendingCount = 0;
  
  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(seconds: 1),
      vsync: this,
    );
    
    _startStatusMonitoring();
  }
  
  @override
  void dispose() {
    _animationController.dispose();
    _statusTimer?.cancel();
    super.dispose();
  }
  
  void _startStatusMonitoring() {
    _statusTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => _checkSyncStatus(),
    );
    _checkSyncStatus();
  }
  
  Future<void> _checkSyncStatus() async {
    try {
      // This would integrate with your sync services
      // For now, using placeholder logic
      if (mounted) {
        setState(() {
          // Update status and pending count
        });
      }
    } catch (e) {
      // Handle errors
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: widget.onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedBuilder(
              animation: _animationController,
              builder: (context, child) {
                if (_status == SyncStatusState.syncing) {
                  _animationController.repeat();
                  return Transform.rotate(
                    angle: _animationController.value * 2 * 3.14159,
                    child: Icon(
                      Icons.sync,
                      size: 18,
                      color: Colors.blue,
                    ),
                  );
                } else {
                  _animationController.stop();
                  return Icon(
                    _getStatusIcon(),
                    size: 18,
                    color: _getStatusColor(),
                  );
                }
              },
            ),
            if (_pendingCount > 0) ...[
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.orange,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _pendingCount.toString(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
  
  IconData _getStatusIcon() {
    switch (_status) {
      case SyncStatusState.pending:
        return Icons.schedule;
      case SyncStatusState.error:
        return Icons.sync_problem;
      case SyncStatusState.warning:
        return Icons.warning;
      case SyncStatusState.idle:
        return Icons.cloud_done;
      case SyncStatusState.syncing:
        return Icons.sync;
    }
  }
  
  Color _getStatusColor() {
    switch (_status) {
      case SyncStatusState.syncing:
        return Colors.blue;
      case SyncStatusState.pending:
        return Colors.orange;
      case SyncStatusState.error:
        return Colors.red;
      case SyncStatusState.warning:
        return Colors.amber;
      case SyncStatusState.idle:
        return Colors.green;
    }
  }
}

// Enum for sync status states
enum SyncStatusState {
  idle,
  syncing,
  pending,
  error,
  warning,
}

// Required imports (these would need to be added to the actual imports)
class ConnectivityService {
  bool get isOnline => true; // Placeholder
  Stream<NetworkStatus> get networkStatusStream => Stream.empty(); // Placeholder
}

class JWTStorageService {
  // Placeholder
}

class RoleBasedSyncService {
  // Placeholder
}

class EnhancedDatabaseService {
  // Placeholder
}

enum NetworkStatus { online, offline }

// Mock classes for the services that need to be properly imported
// These are just placeholders for the missing import dependencies

