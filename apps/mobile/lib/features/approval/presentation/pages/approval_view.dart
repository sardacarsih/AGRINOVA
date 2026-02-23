import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../blocs/approval_bloc.dart';
import '../../domain/entities/approval_item.dart';
import '../../../dashboard/presentation/pages/asisten_dashboard/asisten_theme.dart';
import '../../../../core/constants/api_constants.dart';

class ApprovalView extends StatefulWidget {
  final String initialStatus;
  final String? focusApprovalId;

  const ApprovalView({
    super.key,
    this.initialStatus = 'PENDING',
    this.focusApprovalId,
  });

  @override
  State<ApprovalView> createState() => _ApprovalViewState();
}

class _ApprovalViewState extends State<ApprovalView>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<String> _tabs = ['Semua', 'Pending', 'Disetujui', 'Ditolak'];
  bool _focusHandled = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _tabController.index = _getIndexFromStatus(
      widget.initialStatus.toUpperCase(),
    );
    _tabController.addListener(_handleTabSelection);
  }

  @override
  void didUpdateWidget(covariant ApprovalView oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.focusApprovalId != widget.focusApprovalId) {
      _focusHandled = false;
    }

    if (oldWidget.initialStatus != widget.initialStatus) {
      _syncTabToStatus(widget.initialStatus.toUpperCase());
    }
  }

  void _handleTabSelection() {
    if (_tabController.indexIsChanging) {
      final status = _getStatusFromIndex(_tabController.index);
      context.read<ApprovalBloc>().add(ApprovalLoadRequested(status: status));
    }
  }

  String? _getStatusFromIndex(int index) {
    switch (index) {
      case 0:
        return 'SEMUA';
      case 1:
        return 'PENDING';
      case 2:
        return 'APPROVED';
      case 3:
        return 'REJECTED';
      default:
        return 'PENDING';
    }
  }

  int _getIndexFromStatus(String status) {
    switch (status) {
      case 'SEMUA':
        return 0;
      case 'PENDING':
        return 1;
      case 'APPROVED':
        return 2;
      case 'REJECTED':
        return 3;
      default:
        return 1;
    }
  }

  void _syncTabToStatus(String status) {
    final targetIndex = _getIndexFromStatus(status);
    if (targetIndex == _tabController.index) {
      return;
    }

    _tabController.removeListener(_handleTabSelection);
    _tabController.index = targetIndex;
    _tabController.addListener(_handleTabSelection);
  }

  @override
  void dispose() {
    _tabController.removeListener(_handleTabSelection);
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<ApprovalBloc, ApprovalState>(
      listenWhen: (previous, current) =>
          current is ApprovalActionSuccess ||
          current is ApprovalActionFailure ||
          current is ApprovalLoaded,
      listener: (context, state) {
        if (state is ApprovalActionSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AsistenTheme.approvedGreen,
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else if (state is ApprovalActionFailure) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AsistenTheme.rejectedRed,
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else if (state is ApprovalLoaded) {
          _syncTabToStatus(state.activeFilterStatus);
          _handleFocusNotification(state);
        }
      },
      buildWhen: (previous, current) =>
          current is ApprovalLoaded ||
          current is ApprovalLoading ||
          current is ApprovalError,
      builder: (context, state) {
        return Column(
          children: [
            Container(
              color: Colors.white,
              child: TabBar(
                controller: _tabController,
                isScrollable: true,
                labelColor: AsistenTheme.primaryBlue,
                unselectedLabelColor: AsistenTheme.textSecondary,
                indicatorColor: AsistenTheme.primaryBlue,
                indicatorWeight: 3,
                labelStyle: const TextStyle(fontWeight: FontWeight.bold),
                tabs: _tabs.map((tab) => Tab(text: tab)).toList(),
              ),
            ),
            Expanded(child: _buildBody(state)),
          ],
        );
      },
    );
  }

  Widget _buildBody(ApprovalState state) {
    if (state is ApprovalLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state is ApprovalError) {
      return _buildErrorState(state.message);
    }
    if (state is ApprovalLoaded) {
      return _buildContent(state);
    }
    return const SizedBox.shrink();
  }

  Widget _buildErrorState(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 52,
              color: AsistenTheme.rejectedRed,
            ),
            const SizedBox(height: 12),
            const Text(
              'Gagal memuat data',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AsistenTheme.textPrimary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            Text(
              message,
              style: const TextStyle(
                fontSize: 14,
                color: AsistenTheme.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 18),
            ElevatedButton(
              onPressed: () {
                context.read<ApprovalBloc>().add(
                  ApprovalLoadRequested(
                    status: _getStatusFromIndex(_tabController.index),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AsistenTheme.primaryBlue,
                foregroundColor: Colors.white,
              ),
              child: const Text('Coba Lagi'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(ApprovalLoaded state) {
    final groupedApprovals = _buildGroupedApprovals(state.approvals);

    return RefreshIndicator(
      onRefresh: () async {
        context.read<ApprovalBloc>().add(const ApprovalRefreshRequested());
      },
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  vertical: 12,
                  horizontal: 16,
                ),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildStatItem(
                      'Pending',
                      state.stats.pendingCount,
                      AsistenTheme.pendingOrange,
                    ),
                    _buildStatVerticalDivider(),
                    _buildStatItem(
                      'Approved',
                      state.stats.approvedCount,
                      AsistenTheme.approvedGreen,
                    ),
                    _buildStatVerticalDivider(),
                    _buildStatItem(
                      'Rejected',
                      state.stats.rejectedCount,
                      AsistenTheme.rejectedRed,
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (state.warningMessage != null &&
              state.warningMessage!.trim().isNotEmpty)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _buildWarningBanner(state.warningMessage!),
              ),
            ),
          if (groupedApprovals.isEmpty)
            SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.inbox, size: 64, color: Colors.grey[300]),
                    const SizedBox(height: 16),
                    Text(
                      'Tidak ada data approval',
                      style: TextStyle(color: Colors.grey[500]),
                    ),
                  ],
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate((context, index) {
                  final mandorGroup = groupedApprovals[index];
                  return _buildMandorGroupCard(mandorGroup);
                }, childCount: groupedApprovals.length),
              ),
            ),
          const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
        ],
      ),
    );
  }

  Widget _buildWarningBanner(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AsistenTheme.pendingOrange.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: AsistenTheme.pendingOrange.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.warning_amber_rounded,
            size: 18,
            color: AsistenTheme.pendingOrange,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: AsistenTheme.textSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMandorGroupCard(_MandorApprovalGroup group) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.badge_outlined,
                size: 18,
                color: AsistenTheme.textPrimary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  group.mandorName,
                  style: const TextStyle(
                    color: AsistenTheme.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${group.totalRecords} data, ${group.totalTbs} janjang',
            style: const TextStyle(
              color: AsistenTheme.textSecondary,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 12),
          ...group.dateGroups.map(_buildDateGroupSection),
        ],
      ),
    );
  }

  Widget _buildDateGroupSection(_DateApprovalGroup dateGroup) {
    final dateLabel = _formatHarvestDate(dateGroup.date);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.calendar_today,
                size: 14,
                color: AsistenTheme.primaryBlue,
              ),
              const SizedBox(width: 6),
              Text(
                dateLabel,
                style: const TextStyle(
                  color: AsistenTheme.primaryBlue,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              const Spacer(),
              Text(
                '${dateGroup.totalRecords} data',
                style: const TextStyle(
                  color: AsistenTheme.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ...dateGroup.blockGroups.map(_buildBlockGroupSection),
        ],
      ),
    );
  }

  String _formatHarvestDate(DateTime date) {
    try {
      return DateFormat('d MMM yyyy', 'id_ID').format(date);
    } catch (_) {
      return DateFormat('d MMM yyyy').format(date);
    }
  }

  Widget _buildBlockGroupSection(_BlockApprovalGroup blockGroup) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.location_on_outlined,
                size: 16,
                color: AsistenTheme.textSecondary,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Blok ${blockGroup.blockName}',
                  style: const TextStyle(
                    color: AsistenTheme.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
              Text(
                '${blockGroup.totalTbs} janjang',
                style: const TextStyle(
                  color: AsistenTheme.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...blockGroup.items.map(_buildEmployeeRow),
        ],
      ),
    );
  }

  Widget _buildEmployeeRow(ApprovalItem item) {
    final employeeName = _resolveEmployeeName(item);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () => _showApprovalDetailDialog(item),
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (item.photoUrls != null && item.photoUrls!.isNotEmpty) ...[
                    Builder(
                      builder: (context) {
                        final url = _resolvePhotoUrl(item.photoUrls!.first);
                        return ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: Image.network(
                            url,
                            width: 48,
                            height: 48,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return Container(
                                width: 48,
                                height: 48,
                                color: Colors.grey[200],
                                alignment: Alignment.center,
                                child: const Icon(
                                  Icons.broken_image,
                                  size: 16,
                                  color: Colors.grey,
                                ),
                              );
                            },
                          ),
                        );
                      },
                    ),
                    const SizedBox(width: 8),
                  ],
                  const Icon(
                    Icons.person_outline,
                    size: 14,
                    color: AsistenTheme.textSecondary,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      employeeName,
                      style: const TextStyle(
                        color: AsistenTheme.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  Text(
                    '${item.tbsCount} janjang',
                    style: const TextStyle(
                      color: AsistenTheme.textPrimary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Waktu kirim: ${item.elapsedTime}',
                style: const TextStyle(
                  color: AsistenTheme.textSecondary,
                  fontSize: 11,
                ),
              ),
              const SizedBox(height: 6),
              _buildQualitySummary(item),
              const SizedBox(height: 8),
              if (item.status == 'PENDING')
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _showApproveConfirm(context, item),
                        icon: const Icon(
                          Icons.check,
                          size: 16,
                          color: Colors.white,
                        ),
                        label: const Text('Setuju'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AsistenTheme.approvedGreen,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _showRejectDialog(context, item),
                        icon: const Icon(
                          Icons.close,
                          size: 16,
                          color: AsistenTheme.rejectedRed,
                        ),
                        label: const Text('Tolak'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AsistenTheme.rejectedRed,
                          side: const BorderSide(
                            color: AsistenTheme.rejectedRed,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                  ],
                )
              else
                _buildStatusBadge(item.status),
            ],
          ),
        ),
      ),
    );
  }

  String _resolveEmployeeName(ApprovalItem item) {
    final employeeText = item.employees.trim();
    if (employeeText.isNotEmpty) {
      return employeeText;
    }
    return 'Karyawan tidak diketahui';
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    String text;
    IconData icon;

    switch (status) {
      case 'APPROVED':
        color = AsistenTheme.approvedGreen;
        text = 'Disetujui';
        icon = Icons.check_circle;
        break;
      case 'REJECTED':
        color = AsistenTheme.rejectedRed;
        text = 'Ditolak';
        icon = Icons.cancel;
        break;
      default:
        color = AsistenTheme.pendingOrange;
        text = 'Pending';
        icon = Icons.pending;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Text(
            text,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showApprovalDetailDialog(ApprovalItem item) async {
    if (!mounted) {
      return;
    }

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Detail Approval Panen'),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildDetailRow('ID Panen', item.id),
                _buildDetailRow('Mandor', item.mandorName),
                _buildDetailRow('Karyawan', _resolveEmployeeName(item)),
                _buildDetailRow('Divisi', item.divisionName),
                _buildDetailRow('Blok', item.blockName),
                _buildDetailRow('Status', _resolveStatusLabel(item.status)),
                _buildDetailRow('Janjang', '${item.tbsCount}'),
                _buildDetailRow('Total Kualitas', '${item.qualityTotal}'),
                _buildDetailRow('Jjg Matang', '${item.jjgMatang}'),
                _buildDetailRow('Jjg Mentah', '${item.jjgMentah}'),
                _buildDetailRow('Jjg Lewat Matang', '${item.jjgLewatMatang}'),
                _buildDetailRow(
                  'Jjg Busuk/Abnormal',
                  '${item.jjgBusukAbnormal}',
                ),
                _buildDetailRow(
                  'Jjg Tangkai Panjang',
                  '${item.jjgTangkaiPanjang}',
                ),
                _buildDetailRow(
                  'Berat',
                  '${item.weight.toStringAsFixed(1)} kg',
                ),
                _buildDetailRow(
                  'Tanggal Panen',
                  _formatHarvestDate(item.harvestDate),
                ),
                _buildDetailRow(
                  'Dikirim',
                  DateFormat(
                    'd MMM yyyy HH:mm',
                    'id_ID',
                  ).format(item.submittedAt),
                ),
                if (item.notes != null && item.notes!.trim().isNotEmpty)
                  _buildDetailRow('Catatan', item.notes!.trim()),
                if (item.hasPhoto &&
                    item.photoUrls != null &&
                    item.photoUrls!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Text(
                    'Foto Panen',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: item.photoUrls!.map((photoUrl) {
                      final resolvedUrl = _resolvePhotoUrl(photoUrl);
                      return GestureDetector(
                        onTap: () => _showFullScreenImage(context, resolvedUrl),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            resolvedUrl,
                            width: 120,
                            height: 120,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return Container(
                                width: 120,
                                height: 120,
                                color: Colors.grey[200],
                                child: const Icon(
                                  Icons.broken_image,
                                  color: Colors.grey,
                                ),
                              );
                            },
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Tutup'),
            ),
            if (item.status == 'PENDING') ...[
              OutlinedButton(
                onPressed: () {
                  Navigator.of(dialogContext).pop();
                  _showRejectDialog(context, item);
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: AsistenTheme.rejectedRed,
                ),
                child: const Text('Tolak'),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(dialogContext).pop();
                  _showApproveConfirm(context, item);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AsistenTheme.approvedGreen,
                ),
                child: const Text('Setujui'),
              ),
            ],
          ],
        );
      },
    );
  }

  Widget _buildQualitySummary(ApprovalItem item) {
    if (!item.hasQualityData) {
      return const Text(
        'Kualitas buah: data belum tersedia',
        style: TextStyle(color: AsistenTheme.textSecondary, fontSize: 11),
      );
    }

    return Wrap(
      spacing: 6,
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
        color: AsistenTheme.primaryBlue.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$label: $value',
        style: const TextStyle(
          color: AsistenTheme.textSecondary,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey[600],
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              color: AsistenTheme.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  String _resolveStatusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return 'Disetujui';
      case 'REJECTED':
        return 'Ditolak';
      default:
        return 'Pending';
    }
  }

  Widget _buildStatItem(String label, int count, Color color) {
    return Text(
      '$label: $count',
      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color),
    );
  }

  Widget _buildStatVerticalDivider() {
    return Container(height: 20, width: 1, color: Colors.black12);
  }

  List<_MandorApprovalGroup> _buildGroupedApprovals(
    List<ApprovalItem> approvals,
  ) {
    final mandorMaps =
        <String, Map<DateTime, Map<String, List<ApprovalItem>>>>{};
    final mandorNameByKey = <String, String>{};
    final blockNameByKey = <String, String>{};

    for (final item in approvals) {
      final mandorKey = item.mandorId.isNotEmpty
          ? item.mandorId
          : item.mandorName;
      final blockKey = item.blockId.isNotEmpty ? item.blockId : item.blockName;
      final dateKey = DateUtils.dateOnly(item.harvestDate);

      mandorNameByKey[mandorKey] = item.mandorName;
      blockNameByKey[blockKey] = item.blockName;

      final byDate = mandorMaps.putIfAbsent(mandorKey, () => {});
      final byBlock = byDate.putIfAbsent(dateKey, () => {});
      final items = byBlock.putIfAbsent(blockKey, () => []);
      items.add(item);
    }

    final groups = <_MandorApprovalGroup>[];

    for (final mandorEntry in mandorMaps.entries) {
      final dateGroups = <_DateApprovalGroup>[];

      for (final dateEntry in mandorEntry.value.entries) {
        final blockGroups = <_BlockApprovalGroup>[];

        for (final blockEntry in dateEntry.value.entries) {
          final sortedItems = List<ApprovalItem>.from(blockEntry.value)
            ..sort((a, b) => b.submittedAt.compareTo(a.submittedAt));

          blockGroups.add(
            _BlockApprovalGroup(
              blockId: blockEntry.key,
              blockName: blockNameByKey[blockEntry.key] ?? '-',
              items: sortedItems,
            ),
          );
        }

        blockGroups.sort((a, b) => a.blockName.compareTo(b.blockName));

        dateGroups.add(
          _DateApprovalGroup(date: dateEntry.key, blockGroups: blockGroups),
        );
      }

      dateGroups.sort((a, b) => b.date.compareTo(a.date));

      groups.add(
        _MandorApprovalGroup(
          mandorId: mandorEntry.key,
          mandorName: mandorNameByKey[mandorEntry.key] ?? '-',
          dateGroups: dateGroups,
        ),
      );
    }

    groups.sort((a, b) => a.mandorName.compareTo(b.mandorName));
    return groups;
  }

  void _showApproveConfirm(BuildContext context, ApprovalItem item) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Setujui Panen?'),
        content: Text(
          'Anda akan menyetujui panen karyawan ${_resolveEmployeeName(item)}.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<ApprovalBloc>().add(
                ApprovalApproveRequested(id: item.id),
              );
            },
            child: const Text('Setuju'),
          ),
        ],
      ),
    );
  }

  void _showRejectDialog(BuildContext context, ApprovalItem item) {
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Tolak Panen'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Berikan alasan penolakan untuk ${_resolveEmployeeName(item)}:',
            ),
            const SizedBox(height: 8),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                hintText: 'Alasan penolakan...',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              if (reasonController.text.isEmpty) {
                ScaffoldMessenger.of(ctx).showSnackBar(
                  const SnackBar(content: Text('Alasan harus diisi')),
                );
                return;
              }
              Navigator.pop(ctx);
              context.read<ApprovalBloc>().add(
                ApprovalRejectRequested(
                  id: item.id,
                  reason: reasonController.text,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AsistenTheme.rejectedRed,
            ),
            child: const Text('Tolak', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showFullScreenImage(BuildContext context, String imageUrl) {
    final resolvedUrl = _resolvePhotoUrl(imageUrl);
    if (resolvedUrl.isEmpty) {
      return;
    }

    showDialog(
      useRootNavigator: true,
      context: context,
      barrierColor: Colors.black87,
      builder: (context) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: EdgeInsets.zero,
        child: SizedBox.expand(
          child: Stack(
            fit: StackFit.expand,
            children: [
              InteractiveViewer(
                minScale: 1.0,
                maxScale: 4.0,
                child: Center(
                  child: Image.network(
                    resolvedUrl,
                    fit: BoxFit.contain,
                    loadingBuilder: (context, child, loadingProgress) {
                      if (loadingProgress == null) return child;
                      return const Center(
                        child: CircularProgressIndicator(color: Colors.white),
                      );
                    },
                    errorBuilder: (context, error, stackTrace) {
                      return const Center(
                        child: Icon(
                          Icons.broken_image,
                          color: Colors.white70,
                          size: 48,
                        ),
                      );
                    },
                  ),
                ),
              ),
              Positioned(
                top: 40,
                right: 20,
                child: CircleAvatar(
                  backgroundColor: Colors.black54,
                  child: IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () =>
                        Navigator.of(context, rootNavigator: true).pop(),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _handleFocusNotification(ApprovalLoaded state) {
    final focusId = widget.focusApprovalId;
    if (_focusHandled || focusId == null || focusId.isEmpty) {
      return;
    }

    _focusHandled = true;
    ApprovalItem? focusedItem;
    for (final item in state.approvals) {
      if (item.id == focusId) {
        focusedItem = item;
        break;
      }
    }

    final found = focusedItem != null;
    final message = found
        ? 'Membuka detail transaksi panen $focusId'
        : 'Transaksi panen $focusId tidak ada pada filter ${state.activeFilterStatus}';

    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        backgroundColor: found
            ? AsistenTheme.approvedGreen
            : AsistenTheme.pendingOrange,
      ),
    );

    if (focusedItem != null) {
      final target = focusedItem;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) {
          return;
        }
        _showApprovalDetailDialog(target);
      });
    }
  }

  String _resolvePhotoUrl(String url) {
    final trimmed = url.trim();
    if (trimmed.isEmpty) {
      return trimmed;
    }

    final lower = trimmed.toLowerCase();
    if (lower.startsWith('http://') ||
        lower.startsWith('https://') ||
        lower.startsWith('data:image/')) {
      return trimmed;
    }

    final baseUrl = ApiConstants.baseUrl.endsWith('/')
        ? ApiConstants.baseUrl.substring(0, ApiConstants.baseUrl.length - 1)
        : ApiConstants.baseUrl;
    final normalizedPath = trimmed.startsWith('/') ? trimmed : '/$trimmed';
    return '$baseUrl$normalizedPath';
  }
}

class _MandorApprovalGroup {
  final String mandorId;
  final String mandorName;
  final List<_DateApprovalGroup> dateGroups;

  const _MandorApprovalGroup({
    required this.mandorId,
    required this.mandorName,
    required this.dateGroups,
  });

  int get totalRecords =>
      dateGroups.fold(0, (sum, date) => sum + date.totalRecords);

  int get totalTbs => dateGroups.fold(0, (sum, date) => sum + date.totalTbs);
}

class _DateApprovalGroup {
  final DateTime date;
  final List<_BlockApprovalGroup> blockGroups;

  const _DateApprovalGroup({required this.date, required this.blockGroups});

  int get totalRecords =>
      blockGroups.fold(0, (sum, block) => sum + block.items.length);

  int get totalTbs => blockGroups.fold(0, (sum, block) => sum + block.totalTbs);
}

class _BlockApprovalGroup {
  final String blockId;
  final String blockName;
  final List<ApprovalItem> items;

  const _BlockApprovalGroup({
    required this.blockId,
    required this.blockName,
    required this.items,
  });

  int get totalTbs => items.fold(0, (sum, item) => sum + item.tbsCount);
}
