import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../data/repositories/manager_harvest_approval_repository.dart';
import '../../../../../../core/di/service_locator.dart';
import '../../../../../../core/network/graphql_client_service.dart';
import '../../../../../../core/services/fcm_service.dart';
import '../../../../../../core/theme/runtime_theme_slot_resolver.dart';
import '../../../../../../core/utils/sync_error_message_helper.dart';
import '../../../../../auth/presentation/blocs/auth_bloc.dart';
import '../manager_theme.dart';

class ManagerApprovalPage extends StatefulWidget {
  const ManagerApprovalPage({super.key});

  @override
  State<ManagerApprovalPage> createState() => _ManagerApprovalPageState();
}

class _ManagerApprovalPageState extends State<ManagerApprovalPage> {
  static const String _cacheKey = 'manager_pending_approvals_v1';

  late final ManagerHarvestApprovalRepository _repository;

  bool _isLoading = true;
  bool _isProcessing = false;
  String? _errorMessage;
  List<ManagerHarvestApprovalItem> _items = const [];
  StreamSubscription<HarvestNotificationEvent>? _harvestNotificationSub;
  Timer? _refreshDebounce;

  // Batch selection state
  bool _batchMode = false;
  final Set<String> _selectedIds = {};

  @override
  void initState() {
    super.initState();
    _repository = ManagerHarvestApprovalRepository(
      graphqlClient: ServiceLocator.get<GraphQLClientService>(),
    );
    _harvestNotificationSub = FCMService.harvestNotificationStream.listen(
      _handleNotification,
    );
    _restoreCachedApprovals();
    _loadPendingApprovals();
  }

  @override
  void dispose() {
    _harvestNotificationSub?.cancel();
    _refreshDebounce?.cancel();
    super.dispose();
  }

  Future<void> _loadPendingApprovals({bool showLoader = true}) async {
    if (showLoader) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final items = await _repository.fetchPendingApprovals();
      if (!mounted) {
        return;
      }
      setState(() {
        _items = items;
        _isLoading = false;
        _errorMessage = null;
      });
      unawaited(_saveApprovalsCache(items));
    } catch (e) {
      final fallbackMessage = SyncErrorMessageHelper.toUserMessage(
        e,
        action: 'memuat daftar approval panen',
      );
      final cachedItems = await _readCachedApprovals();
      if (!mounted) {
        return;
      }
      setState(() {
        _isLoading = false;
        if (cachedItems != null && cachedItems.isNotEmpty) {
          _items = cachedItems;
          _errorMessage =
              'Menampilkan data terakhir tersimpan. $fallbackMessage';
        } else {
          _errorMessage = fallbackMessage;
        }
      });
    }
  }

  Future<void> _restoreCachedApprovals() async {
    final cachedItems = await _readCachedApprovals();
    if (!mounted || cachedItems == null || cachedItems.isEmpty) {
      return;
    }

    setState(() {
      _items = cachedItems;
      _isLoading = false;
    });
  }

  Future<void> _saveApprovalsCache(
    List<ManagerHarvestApprovalItem> items,
  ) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _cacheKey,
        jsonEncode(items.map((item) => item.toJson()).toList()),
      );
    } catch (_) {
      // Ignore cache write failures.
    }
  }

  Future<List<ManagerHarvestApprovalItem>?> _readCachedApprovals() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_cacheKey);
      if (raw == null || raw.trim().isEmpty) {
        return null;
      }

      final decoded = jsonDecode(raw);
      if (decoded is! List) {
        return null;
      }

      return decoded
          .whereType<Map<String, dynamic>>()
          .map(ManagerHarvestApprovalItem.fromJson)
          .toList(growable: false);
    } catch (_) {
      return null;
    }
  }

  void _handleNotification(HarvestNotificationEvent event) {
    if (!mounted) {
      return;
    }

    final authState = context.read<AuthBloc>().state;
    if (authState is! AuthAuthenticated) {
      return;
    }
    if (authState.user.role.toUpperCase() != 'MANAGER') {
      return;
    }

    final action = event.action.toUpperCase();
    final type = event.type.toUpperCase();
    final isRelevant =
        action == 'APPROVAL_NEEDED' ||
        action == 'APPROVED' ||
        action == 'REJECTED' ||
        action == 'ESCALATED' ||
        type == 'HARVEST_APPROVAL_NEEDED' ||
        type == 'HARVEST_STATUS_UPDATE' ||
        type == 'HARVEST_ESCALATION';

    if (!isRelevant) {
      return;
    }

    _refreshDebounce?.cancel();
    _refreshDebounce = Timer(const Duration(milliseconds: 500), () {
      _loadPendingApprovals(showLoader: false);
    });
  }

  Future<void> _approveItem(ManagerHarvestApprovalItem item) async {
    if (_isProcessing) {
      return;
    }
    setState(() => _isProcessing = true);
    try {
      await _repository.approveHarvestRecord(item.id);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Data panen berhasil disetujui',
            style: TextStyle(
              color: RuntimeThemeSlotResolver.notificationBannerText(
                context,
                fallback: Colors.white,
              ),
            ),
          ),
          backgroundColor: RuntimeThemeSlotResolver.notificationBannerBackground(
            context,
            fallback: ManagerTheme.approvedGreen,
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
      await _loadPendingApprovals(showLoader: false);
    } catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            SyncErrorMessageHelper.toUserMessage(
              e,
              action: 'menyetujui data panen',
            ),
            style: TextStyle(
              color: RuntimeThemeSlotResolver.notificationBannerText(
                context,
                fallback: Colors.white,
              ),
            ),
          ),
          backgroundColor: RuntimeThemeSlotResolver.notificationBannerBackground(
            context,
            fallback: ManagerTheme.rejectedRed,
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  Future<void> _rejectItem(
    ManagerHarvestApprovalItem item,
    String rejectedReason,
  ) async {
    if (_isProcessing) {
      return;
    }
    setState(() => _isProcessing = true);
    try {
      await _repository.rejectHarvestRecord(item.id, rejectedReason);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Data panen berhasil ditolak',
            style: TextStyle(
              color: RuntimeThemeSlotResolver.notificationBannerText(
                context,
                fallback: Colors.white,
              ),
            ),
          ),
          backgroundColor: RuntimeThemeSlotResolver.notificationBannerBackground(
            context,
            fallback: ManagerTheme.pendingOrange,
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
      await _loadPendingApprovals(showLoader: false);
    } catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            SyncErrorMessageHelper.toUserMessage(
              e,
              action: 'menolak data panen',
            ),
            style: TextStyle(
              color: RuntimeThemeSlotResolver.notificationBannerText(
                context,
                fallback: Colors.white,
              ),
            ),
          ),
          backgroundColor: RuntimeThemeSlotResolver.notificationBannerBackground(
            context,
            fallback: ManagerTheme.rejectedRed,
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  void _toggleBatchMode() {
    setState(() {
      _batchMode = !_batchMode;
      _selectedIds.clear();
    });
  }

  void _toggleSelection(String id) {
    setState(() {
      if (_selectedIds.contains(id)) {
        _selectedIds.remove(id);
      } else {
        _selectedIds.add(id);
      }
    });
  }

  void _toggleSelectAll() {
    setState(() {
      if (_selectedIds.length == _items.length) {
        _selectedIds.clear();
      } else {
        _selectedIds
          ..clear()
          ..addAll(_items.map((e) => e.id));
      }
    });
  }

  Future<void> _batchApproveSelected() async {
    if (_selectedIds.isEmpty || _isProcessing) return;

    final count = _selectedIds.length;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: RuntimeThemeSlotResolver.modalBackground(
          dialogContext,
          fallback: ManagerTheme.cardBackground,
        ),
        title: const Text('Batch Approval'),
        content: Text('Setujui $count data panen yang dipilih?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(
              'Batal',
              style: TextStyle(
                color: RuntimeThemeSlotResolver.modalAccent(
                  dialogContext,
                  fallback: ManagerTheme.primaryPurple,
                ),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: RuntimeThemeSlotResolver.modalAccent(
                dialogContext,
                fallback: ManagerTheme.approvedGreen,
              ),
              foregroundColor: Colors.white,
            ),
            child: Text('Setujui $count'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isProcessing = true);
    try {
      final result = await _repository.batchApproval(
        ids: _selectedIds.toList(),
        action: 'APPROVE',
      );
      if (!mounted) return;

      final msg = result.failedCount > 0
          ? '${result.successCount} disetujui, ${result.failedCount} gagal'
          : '${result.successCount} data panen disetujui';

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            msg,
            style: TextStyle(
              color: RuntimeThemeSlotResolver.notificationBannerText(
                context,
                fallback: Colors.white,
              ),
            ),
          ),
          backgroundColor: RuntimeThemeSlotResolver.notificationBannerBackground(
            context,
            fallback: result.failedCount > 0
                ? ManagerTheme.pendingOrange
                : ManagerTheme.approvedGreen,
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
      setState(() {
        _batchMode = false;
        _selectedIds.clear();
      });
      await _loadPendingApprovals(showLoader: false);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            SyncErrorMessageHelper.toUserMessage(
              e,
              action: 'batch approval',
            ),
            style: TextStyle(
              color: RuntimeThemeSlotResolver.notificationBannerText(
                context,
                fallback: Colors.white,
              ),
            ),
          ),
          backgroundColor: RuntimeThemeSlotResolver.notificationBannerBackground(
            context,
            fallback: ManagerTheme.rejectedRed,
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<void> _batchRejectSelected() async {
    if (_selectedIds.isEmpty || _isProcessing) return;

    final count = _selectedIds.length;
    final reasonController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: RuntimeThemeSlotResolver.modalBackground(
          dialogContext,
          fallback: ManagerTheme.cardBackground,
        ),
        title: const Text('Batch Tolak'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Tolak $count data panen yang dipilih?'),
            const SizedBox(height: 10),
            TextField(
              controller: reasonController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Alasan penolakan...',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(
              'Batal',
              style: TextStyle(
                color: RuntimeThemeSlotResolver.modalAccent(
                  dialogContext,
                  fallback: ManagerTheme.primaryPurple,
                ),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              final reason = reasonController.text.trim();
              if (reason.isEmpty) {
                ScaffoldMessenger.of(dialogContext).showSnackBar(
                  SnackBar(
                    content: Text(
                      'Alasan harus diisi',
                      style: TextStyle(
                        color: RuntimeThemeSlotResolver.notificationBannerText(
                          dialogContext,
                          fallback: Colors.white,
                        ),
                      ),
                    ),
                    backgroundColor:
                        RuntimeThemeSlotResolver.notificationBannerBackground(
                      dialogContext,
                      fallback: ManagerTheme.pendingOrange,
                    ),
                  ),
                );
                return;
              }
              Navigator.of(dialogContext).pop(true);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: RuntimeThemeSlotResolver.modalAccent(
                dialogContext,
                fallback: ManagerTheme.rejectedRed,
              ),
              foregroundColor: Colors.white,
            ),
            child: Text('Tolak $count'),
          ),
        ],
      ),
    );

    final reason = reasonController.text.trim();
    if (confirmed != true || reason.isEmpty) return;

    setState(() => _isProcessing = true);
    try {
      final result = await _repository.batchApproval(
        ids: _selectedIds.toList(),
        action: 'REJECT',
        rejectionReason: reason,
      );
      if (!mounted) return;

      final msg = result.failedCount > 0
          ? '${result.successCount} ditolak, ${result.failedCount} gagal'
          : '${result.successCount} data panen ditolak';

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            msg,
            style: TextStyle(
              color: RuntimeThemeSlotResolver.notificationBannerText(
                context,
                fallback: Colors.white,
              ),
            ),
          ),
          backgroundColor: RuntimeThemeSlotResolver.notificationBannerBackground(
            context,
            fallback: result.failedCount > 0
                ? ManagerTheme.pendingOrange
                : ManagerTheme.rejectedRed,
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
      setState(() {
        _batchMode = false;
        _selectedIds.clear();
      });
      await _loadPendingApprovals(showLoader: false);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            SyncErrorMessageHelper.toUserMessage(
              e,
              action: 'batch reject',
            ),
            style: TextStyle(
              color: RuntimeThemeSlotResolver.notificationBannerText(
                context,
                fallback: Colors.white,
              ),
            ),
          ),
          backgroundColor: RuntimeThemeSlotResolver.notificationBannerBackground(
            context,
            fallback: ManagerTheme.rejectedRed,
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<void> _confirmApprove(ManagerHarvestApprovalItem item) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: RuntimeThemeSlotResolver.modalBackground(
          dialogContext,
          fallback: ManagerTheme.cardBackground,
        ),
        title: const Text('Setujui Data Panen'),
        content: Text(
          'Setujui data panen dari ${item.mandorName} di blok ${item.blockName}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(
              'Batal',
              style: TextStyle(
                color: RuntimeThemeSlotResolver.modalAccent(
                  dialogContext,
                  fallback: ManagerTheme.primaryPurple,
                ),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: RuntimeThemeSlotResolver.modalAccent(
                dialogContext,
                fallback: ManagerTheme.approvedGreen,
              ),
              foregroundColor: Colors.white,
            ),
            child: const Text('Setujui'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _approveItem(item);
    }
  }

  Future<void> _promptReject(ManagerHarvestApprovalItem item) async {
    final reasonController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: RuntimeThemeSlotResolver.modalBackground(
          dialogContext,
          fallback: ManagerTheme.cardBackground,
        ),
        title: const Text('Tolak Data Panen'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Masukkan alasan penolakan untuk ${item.mandorName}.'),
            const SizedBox(height: 10),
            TextField(
              controller: reasonController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Alasan penolakan...',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(
              'Batal',
              style: TextStyle(
                color: RuntimeThemeSlotResolver.modalAccent(
                  dialogContext,
                  fallback: ManagerTheme.primaryPurple,
                ),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              final reason = reasonController.text.trim();
              if (reason.isEmpty) {
                ScaffoldMessenger.of(dialogContext).showSnackBar(
                  SnackBar(
                    content: Text(
                      'Alasan harus diisi',
                      style: TextStyle(
                        color: RuntimeThemeSlotResolver.notificationBannerText(
                          dialogContext,
                          fallback: Colors.white,
                        ),
                      ),
                    ),
                    backgroundColor:
                        RuntimeThemeSlotResolver.notificationBannerBackground(
                      dialogContext,
                      fallback: ManagerTheme.pendingOrange,
                    ),
                  ),
                );
                return;
              }
              Navigator.of(dialogContext).pop(true);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: RuntimeThemeSlotResolver.modalAccent(
                dialogContext,
                fallback: ManagerTheme.rejectedRed,
              ),
              foregroundColor: Colors.white,
            ),
            child: const Text('Tolak'),
          ),
        ],
      ),
    );

    final reason = reasonController.text.trim();
    if (confirmed == true && reason.isNotEmpty) {
      await _rejectItem(item, reason);
    }
  }

  @override
  Widget build(BuildContext context) {
    final navbarBg = RuntimeThemeSlotResolver.navbarBackground(
      context,
      fallback: ManagerTheme.primaryPurple,
    );
    final navbarFg = RuntimeThemeSlotResolver.navbarForeground(
      context,
      fallback: Colors.white,
    );
    final navbarIcon = RuntimeThemeSlotResolver.navbarIcon(
      context,
      fallback: Colors.white,
    );

    return Scaffold(
      backgroundColor: RuntimeThemeSlotResolver.dashboardBackground(
        context,
        fallback: ManagerTheme.scaffoldBackground,
      ),
      appBar: AppBar(
        title: Text(
          'Approval Panen',
          style: TextStyle(color: navbarFg, fontWeight: FontWeight.w600),
        ),
        flexibleSpace: RuntimeThemeSlotResolver.hasNavbarBackground
            ? Container(color: navbarBg)
            : Container(
                decoration: const BoxDecoration(
                  gradient: ManagerTheme.headerGradient,
                ),
              ),
        backgroundColor: RuntimeThemeSlotResolver.hasNavbarBackground
            ? navbarBg
            : Colors.transparent,
        iconTheme: IconThemeData(color: navbarIcon),
        actions: [
          if (_batchMode && _items.isNotEmpty)
            IconButton(
              onPressed: _isProcessing ? null : _toggleSelectAll,
              icon: Icon(
                _selectedIds.length == _items.length
                    ? Icons.deselect
                    : Icons.select_all,
                color: navbarIcon,
              ),
              tooltip: _selectedIds.length == _items.length
                  ? 'Batal Pilih Semua'
                  : 'Pilih Semua',
            ),
          if (_items.isNotEmpty)
            IconButton(
              onPressed: _isProcessing ? null : _toggleBatchMode,
              icon: Icon(
                _batchMode ? Icons.close : Icons.checklist_rtl,
                color: navbarIcon,
              ),
              tooltip: _batchMode ? 'Batal Batch' : 'Batch Mode',
            ),
          if (!_batchMode)
            IconButton(
              onPressed: _isProcessing
                  ? null
                  : () => _loadPendingApprovals(showLoader: true),
              icon: Icon(Icons.refresh, color: navbarIcon),
              tooltip: 'Refresh',
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _loadPendingApprovals(showLoader: false),
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading && _items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null && _items.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 120),
          Icon(Icons.cloud_off_rounded, size: 56, color: Colors.grey.shade500),
          const SizedBox(height: 12),
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: ManagerTheme.bodyMedium,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: ElevatedButton.icon(
              onPressed: _isProcessing ? null : () => _loadPendingApprovals(),
              icon: const Icon(Icons.refresh),
              label: const Text('Coba Lagi'),
            ),
          ),
        ],
      );
    }

    if (_items.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 140),
          Icon(
            Icons.task_alt_rounded,
            size: 56,
            color: ManagerTheme.approvedGreen,
          ),
          SizedBox(height: 12),
          Center(
            child: Text(
              'Tidak ada approval pending',
              style: TextStyle(
                color: ManagerTheme.textSecondary,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      itemCount: _items.length + 1,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        if (index == 0) {
          return _buildSummaryCard();
        }
        final item = _items[index - 1];
        return _buildItemCard(item);
      },
    );
  }

  Widget _buildSummaryCard() {
    if (_batchMode) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: ManagerTheme.teamReviewTeal.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: ManagerTheme.teamReviewTeal.withValues(alpha: 0.25),
          ),
        ),
        child: Column(
          children: [
            Row(
              children: [
                const Icon(
                  Icons.checklist_rtl,
                  color: ManagerTheme.teamReviewTeal,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '${_selectedIds.length} dari ${_items.length} dipilih',
                    style: const TextStyle(
                      color: ManagerTheme.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            if (_selectedIds.isNotEmpty) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _isProcessing ? null : _batchRejectSelected,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: ManagerTheme.rejectedRed,
                        side: const BorderSide(color: ManagerTheme.rejectedRed),
                      ),
                      icon: const Icon(Icons.close_rounded, size: 18),
                      label: Text('Tolak (${_selectedIds.length})'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _isProcessing ? null : _batchApproveSelected,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ManagerTheme.approvedGreen,
                        foregroundColor: Colors.white,
                      ),
                      icon: const Icon(Icons.check_rounded, size: 18),
                      label: Text('Setujui (${_selectedIds.length})'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: ManagerTheme.primaryPurple.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: ManagerTheme.primaryPurple.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.pending_actions, color: ManagerTheme.primaryPurple),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Total menunggu approval: ${_items.length} data',
              style: const TextStyle(
                color: ManagerTheme.textPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildItemCard(ManagerHarvestApprovalItem item) {
    final isSelected = _selectedIds.contains(item.id);

    return GestureDetector(
      onTap: _batchMode ? () => _toggleSelection(item.id) : null,
      child: Container(
      decoration: _batchMode && isSelected
          ? BoxDecoration(
              color: ManagerTheme.teamReviewTeal.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: ManagerTheme.teamReviewTeal.withValues(alpha: 0.5),
                width: 1.5,
              ),
            )
          : ManagerTheme.whiteCardDecoration,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_batchMode) ...[
                Checkbox(
                  value: isSelected,
                  onChanged: (_) => _toggleSelection(item.id),
                  activeColor: ManagerTheme.teamReviewTeal,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  visualDensity: VisualDensity.compact,
                ),
                const SizedBox(width: 4),
              ] else ...[
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: ManagerTheme.teamReviewTeal.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.agriculture_outlined,
                    color: ManagerTheme.teamReviewTeal,
                  ),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.mandorName,
                      style: const TextStyle(
                        color: ManagerTheme.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${item.blockName} - ${item.divisionName}',
                      style: ManagerTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 8,
            children: [
              _buildMetricChip('Tanggal', _formatDate(item.harvestDate)),
              _buildMetricChip('Janjang', '${item.bunchCount} jjg'),
              _buildMetricChip(
                'Berat',
                '${item.weightKg.toStringAsFixed(1)} kg',
              ),
            ],
          ),
          const SizedBox(height: 8),
          _buildQualitySummary(item),
          const SizedBox(height: 8),
          Text('Pekerja: ${item.workerLabel}', style: ManagerTheme.bodyMedium),
          const SizedBox(height: 2),
          Text(
            'Submit: ${_formatDateTime(item.submittedAt)}',
            style: ManagerTheme.bodySmall,
          ),
          if (!_batchMode) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isProcessing ? null : () => _promptReject(item),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: ManagerTheme.rejectedRed,
                      side: const BorderSide(color: ManagerTheme.rejectedRed),
                    ),
                    icon: const Icon(Icons.close_rounded, size: 18),
                    label: const Text('Tolak'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed:
                        _isProcessing ? null : () => _confirmApprove(item),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ManagerTheme.approvedGreen,
                      foregroundColor: Colors.white,
                    ),
                    icon: const Icon(Icons.check_rounded, size: 18),
                    label: const Text('Setujui'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
      ),
    );
  }

  Widget _buildMetricChip(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: ManagerTheme.scaffoldBackground,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$label: $value',
        style: const TextStyle(
          color: ManagerTheme.textSecondary,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildQualitySummary(ManagerHarvestApprovalItem item) {
    if (!item.hasQualityData) {
      return const Text(
        'Kualitas buah: data belum tersedia',
        style: TextStyle(color: ManagerTheme.textSecondary, fontSize: 12),
      );
    }

    return Wrap(
      spacing: 8,
      runSpacing: 6,
      children: [
        _buildQualityChip('Matang', item.jjgMatang),
        _buildQualityChip('Mentah', item.jjgMentah),
        _buildQualityChip('Lewat', item.jjgLewatMatang),
        _buildQualityChip('Busuk', item.jjgBusukAbnormal),
        _buildQualityChip('Tangkai', item.jjgTangkaiPanjang),
      ],
    );
  }

  Widget _buildQualityChip(String label, int value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: ManagerTheme.teamReviewTeal.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$label: $value',
        style: const TextStyle(
          color: ManagerTheme.textSecondary,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  String _formatDate(DateTime value) {
    final date = value.toLocal();
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final year = date.year.toString();
    return '$day/$month/$year';
  }

  String _formatDateTime(DateTime value) {
    final date = value.toLocal();
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final hour = date.hour.toString().padLeft(2, '0');
    final minute = date.minute.toString().padLeft(2, '0');
    return '$day/$month $hour:$minute';
  }
}
