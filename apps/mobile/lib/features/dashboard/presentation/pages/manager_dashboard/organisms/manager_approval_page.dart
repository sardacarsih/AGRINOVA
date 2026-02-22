import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../data/repositories/manager_harvest_approval_repository.dart';
import '../../../../../../core/di/service_locator.dart';
import '../../../../../../core/network/graphql_client_service.dart';
import '../../../../../../core/services/fcm_service.dart';
import '../../../../../auth/presentation/blocs/auth_bloc.dart';
import '../manager_theme.dart';

class ManagerApprovalPage extends StatefulWidget {
  const ManagerApprovalPage({super.key});

  @override
  State<ManagerApprovalPage> createState() => _ManagerApprovalPageState();
}

class _ManagerApprovalPageState extends State<ManagerApprovalPage> {
  late final ManagerHarvestApprovalRepository _repository;

  bool _isLoading = true;
  bool _isProcessing = false;
  String? _errorMessage;
  List<ManagerHarvestApprovalItem> _items = const [];
  StreamSubscription<HarvestNotificationEvent>? _harvestNotificationSub;
  Timer? _refreshDebounce;

  @override
  void initState() {
    super.initState();
    _repository = ManagerHarvestApprovalRepository(
      graphqlClient: ServiceLocator.get<GraphQLClientService>(),
    );
    _harvestNotificationSub =
        FCMService.harvestNotificationStream.listen(_handleNotification);
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
    } catch (e) {
      if (!mounted) {
        return;
      }
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString();
      });
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
    final isRelevant = action == 'APPROVAL_NEEDED' ||
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
        const SnackBar(
          content: Text('Data panen berhasil disetujui'),
          backgroundColor: ManagerTheme.approvedGreen,
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
          content: Text(e.toString()),
          backgroundColor: ManagerTheme.rejectedRed,
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
        const SnackBar(
          content: Text('Data panen berhasil ditolak'),
          backgroundColor: ManagerTheme.pendingOrange,
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
          content: Text(e.toString()),
          backgroundColor: ManagerTheme.rejectedRed,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  Future<void> _confirmApprove(ManagerHarvestApprovalItem item) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Setujui Data Panen'),
        content: Text(
          'Setujui data panen dari ${item.mandorName} di blok ${item.blockName}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: ManagerTheme.approvedGreen,
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
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              final reason = reasonController.text.trim();
              if (reason.isEmpty) {
                ScaffoldMessenger.of(dialogContext).showSnackBar(
                  const SnackBar(content: Text('Alasan harus diisi')),
                );
                return;
              }
              Navigator.of(dialogContext).pop(true);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: ManagerTheme.rejectedRed,
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
    return Scaffold(
      backgroundColor: ManagerTheme.scaffoldBackground,
      appBar: AppBar(
        title: const Text(
          'Approval Panen',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
        flexibleSpace: Container(
          decoration:
              const BoxDecoration(gradient: ManagerTheme.headerGradient),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            onPressed: _isProcessing
                ? null
                : () => _loadPendingApprovals(showLoader: true),
            icon: const Icon(Icons.refresh, color: Colors.white),
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
          Icon(Icons.task_alt_rounded,
              size: 56, color: ManagerTheme.approvedGreen),
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
    return Container(
      decoration: ManagerTheme.whiteCardDecoration,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
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
                  'Berat', '${item.weightKg.toStringAsFixed(1)} kg'),
            ],
          ),
          const SizedBox(height: 8),
          Text('Pekerja: ${item.workerLabel}', style: ManagerTheme.bodyMedium),
          const SizedBox(height: 2),
          Text(
            'Submit: ${_formatDateTime(item.submittedAt)}',
            style: ManagerTheme.bodySmall,
          ),
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
                  onPressed: _isProcessing ? null : () => _confirmApprove(item),
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
