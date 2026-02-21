import 'package:flutter/material.dart';
import '../../../../../../core/services/notification_storage_service.dart';
import '../../../../../../core/di/dependency_injection.dart';
import '../mandor_theme.dart';

/// Notification page for Mandor role
/// Shows list of FCM notifications received (approval status from Asisten)
class MandorNotificationPage extends StatefulWidget {
  final VoidCallback? onClose;

  const MandorNotificationPage({super.key, this.onClose});

  @override
  State<MandorNotificationPage> createState() => _MandorNotificationPageState();
}

class _MandorNotificationPageState extends State<MandorNotificationPage> {
  final NotificationStorageService _storageService =
      sl<NotificationStorageService>();
  List<AppNotification> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    try {
      await _storageService.initialize();
      final notifications = await _storageService.getNotifications();
      setState(() {
        _notifications = notifications;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MandorTheme.gray900,
      appBar: _buildAppBar(),
      body: _isLoading ? _buildLoadingState() : _buildBody(),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      title: const Text(
        'Notifikasi',
        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 18),
      ),
      backgroundColor: MandorTheme.darkGreen,
      foregroundColor: Colors.white,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: () => Navigator.of(context).pop(),
      ),
      actions: [
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert),
          onSelected: _handleMenuAction,
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'mark_all_read',
              child: Row(
                children: [
                  Icon(Icons.done_all, size: 20),
                  SizedBox(width: 12),
                  Text('Tandai semua dibaca'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'clear_all',
              child: Row(
                children: [
                  Icon(Icons.delete_sweep, size: 20),
                  SizedBox(width: 12),
                  Text('Hapus semua'),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: CircularProgressIndicator(color: MandorTheme.forestGreen),
    );
  }

  Widget _buildBody() {
    if (_notifications.isEmpty) {
      return _buildEmptyState();
    }

    final unreadNotifications = _notifications.where((n) => !n.isRead).toList();
    final readNotifications = _notifications.where((n) => n.isRead).toList();

    return RefreshIndicator(
      onRefresh: _loadNotifications,
      color: MandorTheme.forestGreen,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Unread section
          if (unreadNotifications.isNotEmpty) ...[
            _buildSectionHeader('Belum Dibaca', unreadNotifications.length),
            const SizedBox(height: 8),
            ...unreadNotifications.map(
              (notif) => _buildNotificationCard(notif),
            ),
            const SizedBox(height: 24),
          ],

          // Read section
          if (readNotifications.isNotEmpty) ...[
            _buildSectionHeader('Sudah Dibaca', null),
            const SizedBox(height: 8),
            ...readNotifications.map((notif) => _buildNotificationCard(notif)),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, int? count) {
    return Row(
      children: [
        Text(
          title,
          style: MandorTheme.labelMedium.copyWith(color: MandorTheme.gray400),
        ),
        if (count != null) ...[
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: MandorTheme.forestGreen,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '$count',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildNotificationCard(AppNotification notif) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: notif.isRead
            ? MandorTheme.gray800
            : MandorTheme.forestGreen.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: notif.isRead
            ? Border.all(color: MandorTheme.gray700)
            : Border.all(color: MandorTheme.forestGreen.withValues(alpha: 0.3)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => _handleNotificationTap(notif),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icon
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: _getTypeColor(notif.type).withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    _getTypeIcon(notif.type),
                    color: _getTypeColor(notif.type),
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),

                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              notif.title,
                              style: TextStyle(
                                fontWeight: notif.isRead
                                    ? FontWeight.w500
                                    : FontWeight.w600,
                                fontSize: 14,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          if (!notif.isRead)
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: MandorTheme.forestGreen,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        notif.message,
                        style: TextStyle(
                          fontSize: 13,
                          color: MandorTheme.gray400,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        notif.relativeTime,
                        style: TextStyle(
                          fontSize: 12,
                          color: MandorTheme.gray500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.notifications_none_rounded,
            size: 80,
            color: MandorTheme.gray600,
          ),
          const SizedBox(height: 16),
          Text(
            'Tidak ada notifikasi',
            style: MandorTheme.headingSmall.copyWith(
              color: MandorTheme.gray400,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Notifikasi dari Asisten akan muncul di sini',
            style: MandorTheme.bodySmall.copyWith(color: MandorTheme.gray500),
          ),
          const SizedBox(height: 24),
          TextButton.icon(
            onPressed: _loadNotifications,
            icon: Icon(Icons.refresh, color: MandorTheme.forestGreen),
            label: Text(
              'Refresh',
              style: TextStyle(color: MandorTheme.forestGreen),
            ),
          ),
        ],
      ),
    );
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'harvest_new':
        return Icons.agriculture_rounded;
      case 'harvest_approved':
        return Icons.check_circle_rounded;
      case 'harvest_rejected':
        return Icons.cancel_rounded;
      case 'sync':
        return Icons.sync_rounded;
      case 'system':
        return Icons.info_rounded;
      default:
        return Icons.notifications_rounded;
    }
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'harvest_new':
        return MandorTheme.amberOrange;
      case 'harvest_approved':
        return MandorTheme.forestGreen;
      case 'harvest_rejected':
        return MandorTheme.coralRed;
      case 'sync':
        return MandorTheme.skyBlue;
      case 'system':
        return MandorTheme.amberOrange;
      default:
        return MandorTheme.gray400;
    }
  }

  Future<void> _handleNotificationTap(AppNotification notif) async {
    // Mark as read
    await _storageService.markAsRead(notif.id);
    await _loadNotifications();

    final panenId = notif.metadata?['panen_id'] as String?;
    final action = notif.metadata?['action'] as String?;
    if (!mounted) {
      return;
    }

    if (panenId != null && panenId.isNotEmpty) {
      Navigator.of(
        context,
      ).pop({'tab': 2, 'panenId': panenId, 'action': action});
    }
  }

  Future<void> _handleMenuAction(String action) async {
    switch (action) {
      case 'mark_all_read':
        await _storageService.markAllAsRead();
        await _loadNotifications();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Semua notifikasi ditandai telah dibaca'),
              backgroundColor: MandorTheme.forestGreen,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          );
        }
        break;
      case 'clear_all':
        _showClearAllConfirmation();
        break;
    }
  }

  void _showClearAllConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: MandorTheme.gray800,
        title: const Text(
          'Hapus Semua Notifikasi?',
          style: TextStyle(color: Colors.white),
        ),
        content: const Text(
          'Semua notifikasi akan dihapus secara permanen.',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () async {
              await _storageService.clearAll();
              await _loadNotifications();
              if (!context.mounted || !mounted) return;
              Navigator.of(context).pop();
              ScaffoldMessenger.of(this.context).showSnackBar(
                SnackBar(
                  content: const Text('Semua notifikasi telah dihapus'),
                  backgroundColor: MandorTheme.coralRed,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              );
            },
            child: Text('Hapus', style: TextStyle(color: MandorTheme.coralRed)),
          ),
        ],
      ),
    );
  }
}
