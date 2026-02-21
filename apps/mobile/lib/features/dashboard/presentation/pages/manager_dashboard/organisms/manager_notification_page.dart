import 'package:flutter/material.dart';
import '../../../../../../core/services/notification_storage_service.dart';
import '../../../../../../core/di/dependency_injection.dart';
import '../manager_theme.dart';

/// Notification page for Manager role
/// Shows list of FCM notifications including daily summaries
class ManagerNotificationPage extends StatefulWidget {
  final VoidCallback? onClose;

  const ManagerNotificationPage({Key? key, this.onClose}) : super(key: key);

  @override
  State<ManagerNotificationPage> createState() => _ManagerNotificationPageState();
}

class _ManagerNotificationPageState extends State<ManagerNotificationPage> {
  final NotificationStorageService _storageService = sl<NotificationStorageService>();
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
      backgroundColor: ManagerTheme.scaffoldBackground,
      appBar: _buildAppBar(),
      body: _isLoading ? _buildLoadingState() : _buildBody(),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      title: const Text(
        'Notifikasi',
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w600,
          fontSize: 18,
        ),
      ),
      flexibleSpace: Container(
        decoration: const BoxDecoration(
          gradient: ManagerTheme.headerGradient,
        ),
      ),
      backgroundColor: Colors.transparent,
      elevation: 0,
      iconTheme: const IconThemeData(color: Colors.white),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: () => Navigator.of(context).pop(),
      ),
      actions: [
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert, color: Colors.white),
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
      child: CircularProgressIndicator(
        valueColor: AlwaysStoppedAnimation<Color>(ManagerTheme.primaryPurple),
      ),
    );
  }

  Widget _buildBody() {
    if (_notifications.isEmpty) {
      return _buildEmptyState();
    }

    // Separate notifications by type
    final dailySummaries = _notifications.where((n) => n.type == 'MANAGER_DAILY_SUMMARY').toList();
    final alerts = _notifications.where((n) => 
      n.type == 'MANAGER_PERFORMANCE_ALERT' || 
      n.type == 'MANAGER_LOW_PERFORMANCE' ||
      n.type == 'MANAGER_MANDOR_ABSENCE').toList();
    final others = _notifications.where((n) => 
      !n.type.startsWith('MANAGER_') || n.type == 'MANAGER_TARGET_ACHIEVED').toList();

    return RefreshIndicator(
      onRefresh: _loadNotifications,
      color: ManagerTheme.primaryPurple,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Daily Summary section
          if (dailySummaries.isNotEmpty) ...[
            _buildSectionHeader('📊 Ringkasan Harian', dailySummaries.where((n) => !n.isRead).length),
            const SizedBox(height: 8),
            ...dailySummaries.map((notif) => _buildSummaryCard(notif)),
            const SizedBox(height: 24),
          ],
          
          // Alerts section
          if (alerts.isNotEmpty) ...[
            _buildSectionHeader('⚠️ Alert', alerts.where((n) => !n.isRead).length),
            const SizedBox(height: 8),
            ...alerts.map((notif) => _buildNotificationCard(notif)),
            const SizedBox(height: 24),
          ],
          
          // Other notifications section
          if (others.isNotEmpty) ...[
            _buildSectionHeader('🔔 Notifikasi Lain', null),
            const SizedBox(height: 8),
            ...others.map((notif) => _buildNotificationCard(notif)),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, int? unreadCount) {
    return Row(
      children: [
        Text(
          title,
          style: ManagerTheme.headingMedium.copyWith(fontSize: 16),
        ),
        if (unreadCount != null && unreadCount > 0) ...[
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: ManagerTheme.primaryPurple,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '$unreadCount',
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

  /// Special card for Daily Summary notifications with expanded stats
  Widget _buildSummaryCard(AppNotification notif) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        gradient: notif.isRead 
            ? null 
            : const LinearGradient(
                colors: [Color(0xFFF3E8FF), Color(0xFFEDE9FE)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
        color: notif.isRead ? Colors.white : null,
        borderRadius: BorderRadius.circular(16),
        border: notif.isRead 
            ? Border.all(color: Colors.grey.shade200)
            : Border.all(color: ManagerTheme.primaryPurple.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: ManagerTheme.primaryPurple.withOpacity(0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _handleNotificationTap(notif),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header row
                Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: ManagerTheme.primaryGradient,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.analytics_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
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
                                    fontWeight: notif.isRead ? FontWeight.w500 : FontWeight.w600,
                                    fontSize: 15,
                                    color: ManagerTheme.textPrimary,
                                  ),
                                ),
                              ),
                              if (!notif.isRead)
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                    color: ManagerTheme.primaryPurple,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            notif.relativeTime,
                            style: TextStyle(
                              fontSize: 12,
                              color: ManagerTheme.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                
                // Summary message
                Text(
                  notif.message,
                  style: TextStyle(
                    fontSize: 14,
                    color: ManagerTheme.textSecondary,
                  ),
                ),
                
                // Stats row (parsed from metadata if available)
                if (notif.metadata != null) ...[
                  const SizedBox(height: 12),
                  _buildSummaryStats(notif.metadata!),
                ],
                
                // View detail button
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      onPressed: () => _handleNotificationTap(notif),
                      icon: Icon(
                        Icons.visibility_outlined,
                        size: 18,
                        color: ManagerTheme.primaryPurple,
                      ),
                      label: Text(
                        'Lihat Detail',
                        style: TextStyle(
                          color: ManagerTheme.primaryPurple,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryStats(Map<String, dynamic> metadata) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: ManagerTheme.primaryPurple.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem(
            'Produksi',
            metadata['yesterday_production']?.toString() ?? '-',
            'ton',
            Icons.agriculture,
          ),
          Container(width: 1, height: 30, color: ManagerTheme.textMuted.withOpacity(0.3)),
          _buildStatItem(
            'Target',
            metadata['target_achievement']?.toString() ?? '-',
            '%',
            Icons.trending_up,
          ),
          Container(width: 1, height: 30, color: ManagerTheme.textMuted.withOpacity(0.3)),
          _buildStatItem(
            'Mandor Aktif',
            '${metadata['active_mandors'] ?? '-'}/${metadata['total_mandors'] ?? '-'}',
            '',
            Icons.people,
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, String unit, IconData icon) {
    return Column(
      children: [
        Icon(icon, size: 18, color: ManagerTheme.primaryPurple),
        const SizedBox(height: 4),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: ManagerTheme.textPrimary,
              ),
            ),
            if (unit.isNotEmpty) ...[
              const SizedBox(width: 2),
              Text(
                unit,
                style: TextStyle(
                  fontSize: 11,
                  color: ManagerTheme.textMuted,
                ),
              ),
            ],
          ],
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: ManagerTheme.textMuted,
          ),
        ),
      ],
    );
  }

  Widget _buildNotificationCard(AppNotification notif) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: notif.isRead ? Colors.white : ManagerTheme.primaryPurple.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: notif.isRead 
            ? Border.all(color: Colors.grey.shade200)
            : Border.all(color: ManagerTheme.primaryPurple.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
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
                    color: _getTypeColor(notif.type).withOpacity(0.1),
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
                                fontWeight: notif.isRead ? FontWeight.w500 : FontWeight.w600,
                                fontSize: 14,
                                color: ManagerTheme.textPrimary,
                              ),
                            ),
                          ),
                          if (!notif.isRead)
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: ManagerTheme.primaryPurple,
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
                          color: ManagerTheme.textSecondary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        notif.relativeTime,
                        style: TextStyle(
                          fontSize: 12,
                          color: ManagerTheme.textMuted,
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
            color: ManagerTheme.textMuted.withOpacity(0.3),
          ),
          const SizedBox(height: 16),
          Text(
            'Tidak ada notifikasi',
            style: ManagerTheme.headingMedium.copyWith(
              color: ManagerTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Ringkasan harian akan muncul di sini setiap pagi',
            style: ManagerTheme.bodyMedium.copyWith(
              color: ManagerTheme.textMuted,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          TextButton.icon(
            onPressed: _loadNotifications,
            icon: Icon(Icons.refresh, color: ManagerTheme.primaryPurple),
            label: Text(
              'Refresh',
              style: TextStyle(color: ManagerTheme.primaryPurple),
            ),
          ),
        ],
      ),
    );
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'MANAGER_DAILY_SUMMARY':
        return Icons.analytics_rounded;
      case 'MANAGER_PERFORMANCE_ALERT':
      case 'MANAGER_LOW_PERFORMANCE':
        return Icons.warning_rounded;
      case 'MANAGER_MANDOR_ABSENCE':
        return Icons.person_off_rounded;
      case 'MANAGER_TARGET_ACHIEVED':
        return Icons.emoji_events_rounded;
      case 'MANAGER_WEEKLY_SUMMARY':
        return Icons.calendar_month_rounded;
      default:
        return Icons.notifications_rounded;
    }
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'MANAGER_DAILY_SUMMARY':
      case 'MANAGER_WEEKLY_SUMMARY':
        return ManagerTheme.primaryPurple;
      case 'MANAGER_PERFORMANCE_ALERT':
      case 'MANAGER_LOW_PERFORMANCE':
        return ManagerTheme.pendingOrange;
      case 'MANAGER_MANDOR_ABSENCE':
        return ManagerTheme.rejectedRed;
      case 'MANAGER_TARGET_ACHIEVED':
        return ManagerTheme.approvedGreen;
      default:
        return ManagerTheme.textSecondary;
    }
  }

  Future<void> _handleNotificationTap(AppNotification notif) async {
    // Mark as read
    await _storageService.markAsRead(notif.id);
    await _loadNotifications();

    // Navigate based on notification type
    if (mounted) {
      String message = '';
      switch (notif.type) {
        case 'MANAGER_DAILY_SUMMARY':
          message = 'Navigasi ke detail ringkasan harian';
          break;
        case 'MANAGER_PERFORMANCE_ALERT':
          message = 'Navigasi ke halaman monitoring';
          break;
        case 'MANAGER_TARGET_ACHIEVED':
          message = 'Navigasi ke halaman analytics';
          break;
        default:
          message = 'Notifikasi sudah dibaca';
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: ManagerTheme.primaryPurple,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
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
              backgroundColor: ManagerTheme.approvedGreen,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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
        title: const Text('Hapus Semua Notifikasi?'),
        content: const Text('Semua notifikasi akan dihapus secara permanen.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () async {
              await _storageService.clearAll();
              await _loadNotifications();
              if (mounted) {
                Navigator.of(context).pop();
                ScaffoldMessenger.of(this.context).showSnackBar(
                  SnackBar(
                    content: const Text('Semua notifikasi telah dihapus'),
                    backgroundColor: ManagerTheme.rejectedRed,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                );
              }
            },
            child: Text(
              'Hapus',
              style: TextStyle(color: ManagerTheme.rejectedRed),
            ),
          ),
        ],
      ),
    );
  }
}
